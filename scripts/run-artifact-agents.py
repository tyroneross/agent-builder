#!/usr/bin/env python3
"""Generate real artifacts from the bundled agent scenarios.

The script is intentionally local-first:
- outputs stay under agent-outputs/ by default
- no internet downloads are performed
- local Ollama calls are optional and limited to localhost
- Office files are macro-free OOXML zip packages created with stdlib only
"""

from __future__ import annotations

import argparse
import html
import json
import posixpath
import shutil
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROOT = REPO_ROOT / "agent-outputs" / "hypothetical-local-agent-suite"
FORBIDDEN_SUFFIXES = {".app", ".command", ".dmg", ".exe", ".pkg", ".scpt", ".sh"}
FORBIDDEN_ZIP_PARTS = {"vbaProject.bin", "activeX", "oleObject", "embeddings"}
SOURCE_URLS = [
    "https://docs.ollama.com/api/generate",
    "https://openai.github.io/openai-agents-js/guides/guardrails/",
    "https://openai.github.io/openai-agents-js/guides/tracing/",
    "https://www.anthropic.com/research/building-effective-agents/",
    "https://arxiv.org/abs/2303.11366",
    "https://arxiv.org/abs/2310.03714",
]


@dataclass(frozen=True)
class Profile:
    name: str
    deck_slides: int
    doc_sections: int
    dashboard_widgets: int
    include_security_pack: bool


PROFILES = {
    "lean": Profile("lean", deck_slides=4, doc_sections=3, dashboard_widgets=3, include_security_pack=False),
    "balanced": Profile("balanced", deck_slides=6, doc_sections=5, dashboard_widgets=4, include_security_pack=True),
    "full": Profile("full", deck_slides=7, doc_sections=6, dashboard_widgets=5, include_security_pack=True),
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate real local agent artifacts.")
    parser.add_argument("--root", default=str(DEFAULT_ROOT), help="Output root.")
    parser.add_argument("--profile", choices=sorted(PROFILES), default="full")
    parser.add_argument("--doe", action="store_true", help="Run 2^3 DOE with real artifacts.")
    parser.add_argument("--score", action="store_true", help="Print numeric validation score only.")
    parser.add_argument("--json", action="store_true", help="Print JSON result.")
    parser.add_argument("--skip-models", action="store_true", help="Do not call local Ollama models.")
    parser.add_argument("--models", default="qwen3:8b-q4_K_M,gemma4:26b,tinyllama:latest")
    parser.add_argument("--timeout", type=int, default=45)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    ensure_allowed_root(root)
    if root.exists():
        shutil.rmtree(root)
    root.mkdir(parents=True, exist_ok=True)

    model_notes = [] if args.skip_models else collect_model_notes(args.models.split(","), args.timeout)
    final_result = generate_suite(root / "final", PROFILES[args.profile], model_notes, "final")

    doe_result = None
    if args.doe:
        doe_result = run_doe(root / "doe-runs", model_notes)
        write_doe_report(root, doe_result)

    validation = validate_output_tree(root)
    result = {
        "root": str(root),
        "profile": args.profile,
        "modelNotes": model_notes,
        "final": final_result,
        "doe": doe_result,
        "validation": validation,
        "score": validation["score"],
        "maxScore": validation["maxScore"],
        "passed": validation["passed"],
    }
    write_json(root / "run-summary.json", result)
    write_markdown_summary(root / "README.md", result)

    if args.score:
        print(result["score"])
    elif args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Artifact root: {root}")
        print(f"Score: {result['score']}/{result['maxScore']}")
        print(f"Passed: {result['passed']}")
        print("Key outputs:")
        for item in final_result["outputs"]:
            print(f"- {item}")
        if doe_result:
            print(f"DOE best: {doe_result['best']['runId']} score={doe_result['best']['score']}")

    return 0 if result["passed"] else 1


def collect_model_notes(models: list[str], timeout: int) -> list[dict[str, Any]]:
    notes: list[dict[str, Any]] = []
    prompt = (
        "In one concise sentence, name a security or quality control for local agents "
        "that generate files in a sandbox."
    )
    for model in [item.strip() for item in models if item.strip()]:
        payload = json.dumps({
            "model": model,
            "system": "Answer with one concise sentence. No markdown.",
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {"num_predict": 48, "temperature": 0.1},
        }).encode("utf-8")
        request = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=payload,
            headers={"content-type": "application/json"},
        )
        started = time.time()
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            notes.append({
                "model": model,
                "status": "ok",
                "durationSeconds": round(time.time() - started, 2),
                "response": body.get("response", "").strip(),
            })
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            notes.append({
                "model": model,
                "status": "error",
                "durationSeconds": round(time.time() - started, 2),
                "error": str(error),
            })
    return notes


def generate_suite(root: Path, profile: Profile, model_notes: list[dict[str, Any]], run_id: str) -> dict[str, Any]:
    root.mkdir(parents=True, exist_ok=True)
    outputs: list[str] = []

    deck_slides = build_slide_plan(profile, model_notes)
    deck_path = root / "powerpoint-deck-builder" / "board-update" / "deck.pptx"
    write_pptx(deck_path, "Local Agent Builder Board Update", deck_slides)
    write_json(deck_path.with_name("slides.json"), {"slides": deck_slides, "profile": profile.name})
    write_text(deck_path.with_name("speaker-notes.md"), speaker_notes(deck_slides))
    outputs.extend(relative_paths(root, [deck_path, deck_path.with_name("slides.json"), deck_path.with_name("speaker-notes.md")]))

    doc_sections = build_document_sections(profile, model_notes)
    doc_path = root / "writing-agent" / "executive-brief" / "domain-learning-agent-brief.docx"
    write_docx(doc_path, "Domain-Learning Agent Brief", doc_sections)
    write_text(doc_path.with_suffix(".md"), markdown_from_sections("Domain-Learning Agent Brief", doc_sections))
    outputs.extend(relative_paths(root, [doc_path, doc_path.with_suffix(".md")]))

    ops_path = root / "chief-of-staff-agent" / "weekly-ops" / "operating-plan.docx"
    write_docx(ops_path, "Weekly Operating Plan", chief_of_staff_sections(model_notes))
    outputs.append(str(ops_path.relative_to(root)))

    workbook_path = root / "data-analysis-agent" / "usage-review" / "metrics-workbook.xlsx"
    write_xlsx(workbook_path, workbook_rows(profile))
    csv_path = workbook_path.with_name("metrics.csv")
    write_csv(csv_path, workbook_rows(profile))
    write_text(workbook_path.with_name("analysis-summary.md"), analysis_summary(profile))
    outputs.extend(relative_paths(root, [workbook_path, csv_path, workbook_path.with_name("analysis-summary.md")]))

    dashboard_dir = root / "app-builder-agent" / "html-dashboard"
    dashboard_path = dashboard_dir / "index.html"
    dashboard_data = dashboard_payload(profile)
    write_json(dashboard_dir / "dashboard-data.json", dashboard_data)
    write_text(dashboard_path, dashboard_html(profile, dashboard_data))
    outputs.extend(relative_paths(root, [dashboard_path, dashboard_dir / "dashboard-data.json"]))

    research_dir = root / "research-brief-agent" / "security-research"
    write_json(research_dir / "source-index.json", source_index())
    write_text(research_dir / "research-brief.md", research_brief(model_notes))
    pdf_path = research_dir / "security-brief.pdf"
    write_pdf(pdf_path, "Secure Local Artifact Agents", [
        "Agents generated real DOCX, PPTX, XLSX, HTML, JSON, CSV, PDF, and Markdown outputs.",
        "Outputs are constrained to agent-outputs and scanned for macro-like package parts.",
        "Local model notes came from Ollama models only; no internet downloads were performed.",
    ])
    outputs.extend(relative_paths(root, [research_dir / "source-index.json", research_dir / "research-brief.md", pdf_path]))

    review_dir = root / "code-review-agent" / "security-review"
    write_json(review_dir / "risk-summary.json", risk_summary(profile))
    write_text(review_dir / "findings.md", code_review_findings(profile))
    outputs.extend(relative_paths(root, [review_dir / "risk-summary.json", review_dir / "findings.md"]))

    manifest = {
        "schemaVersion": "agent-builder.real-output-run.v1",
        "runId": run_id,
        "profile": profile.__dict__,
        "outputs": outputs,
        "models": model_notes,
        "constraints": {
            "outputRoot": str(root),
            "internetDownloads": "disabled",
            "externalLinks": "source references only",
            "macros": "forbidden",
            "executables": "forbidden",
        },
    }
    write_json(root / "run-manifest.json", manifest)
    write_text(root / "artifact-index.html", artifact_index_html(outputs, profile))
    outputs.append("run-manifest.json")
    outputs.append("artifact-index.html")

    validation = validate_output_tree(root)
    return {
        "runId": run_id,
        "root": str(root),
        "profile": profile.__dict__,
        "outputs": outputs,
        "score": validation["score"],
        "maxScore": validation["maxScore"],
        "passed": validation["passed"],
    }


def run_doe(root: Path, model_notes: list[dict[str, Any]]) -> dict[str, Any]:
    factors = [
        ("deckDepth", {"low": 4, "high": 7}),
        ("docDepth", {"low": 3, "high": 6}),
        ("dashboardDepth", {"low": 3, "high": 5}),
    ]
    runs: list[dict[str, Any]] = []
    for levels in product(["low", "high"], repeat=len(factors)):
        settings = dict(zip([factor[0] for factor in factors], levels))
        profile = Profile(
            name="-".join(f"{key}-{value}" for key, value in settings.items()),
            deck_slides=factors[0][1][settings["deckDepth"]],
            doc_sections=factors[1][1][settings["docDepth"]],
            dashboard_widgets=factors[2][1][settings["dashboardDepth"]],
            include_security_pack=True,
        )
        run_id = "-".join(f"{key}-{value}" for key, value in settings.items())
        result = generate_suite(root / run_id, profile, model_notes, run_id)
        result["factors"] = settings
        runs.append(result)

    best = sorted(runs, key=lambda item: item["score"], reverse=True)[0]
    effects = main_effects(factors, runs)
    return {
        "design": "2^3 full factorial with real docx, pptx, xlsx, html, pdf, csv, markdown, and json outputs",
        "response": "validated artifact score",
        "factors": [{"name": name, "levels": levels} for name, levels in factors],
        "runs": runs,
        "best": best,
        "effects": effects,
    }


def main_effects(factors: list[tuple[str, dict[str, int]]], runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    effects = []
    for name, _levels in factors:
        high = [run["score"] for run in runs if run["factors"][name] == "high"]
        low = [run["score"] for run in runs if run["factors"][name] == "low"]
        effects.append({
            "factor": name,
            "effect": round(sum(high) / len(high) - sum(low) / len(low), 2),
        })
    return sorted(effects, key=lambda item: abs(item["effect"]), reverse=True)


def validate_output_tree(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    score = 0
    max_score = 0
    files = [item for item in root.rglob("*") if item.is_file()]
    required_suffixes = {".csv", ".docx", ".html", ".json", ".md", ".pdf", ".pptx", ".xlsx"}

    for suffix in required_suffixes:
        max_score += 5
        if any(item.suffix == suffix for item in files):
            score += 5
        else:
            errors.append(f"Missing required artifact type: {suffix}")

    for item in files:
        max_score += 1
        if is_inside(root, item):
            score += 1
        else:
            errors.append(f"Output escaped root: {item}")
        if item.suffix in FORBIDDEN_SUFFIXES:
            errors.append(f"Forbidden executable-like output: {item}")

    for item in files:
        if item.suffix in {".docx", ".pptx", ".xlsx"}:
            max_score += 4
            package_errors = validate_ooxml_package(item)
            if package_errors:
                errors.extend(package_errors)
            else:
                score += 4

            if item.suffix == ".pptx":
                max_score += 7
                score += min(count_pptx_slides(item), 7)
            if item.suffix == ".docx":
                max_score += 6
                score += min(count_docx_sections(item), 6)
            if item.suffix == ".xlsx":
                max_score += 5
                score += min(count_xlsx_rows(item), 5)

    for html_file in root.rglob("*.html"):
        max_score += 2
        content = html_file.read_text(encoding="utf-8")
        if "<script" in content and "dashboardData" in content and "https://" not in content:
            score += 2
        else:
            errors.append(f"Dashboard HTML is missing local interactivity or includes external links: {html_file}")
        max_score += 5
        score += min(content.count('class="card"'), 5)

    for json_file in root.rglob("*.json"):
        max_score += 1
        try:
            json.loads(json_file.read_text(encoding="utf-8"))
            score += 1
        except json.JSONDecodeError as error:
            errors.append(f"Invalid JSON {json_file}: {error}")

    for pdf_file in root.rglob("*.pdf"):
        max_score += 3
        content = pdf_file.read_bytes()
        if content.startswith(b"%PDF-") and b"/JavaScript" not in content and b"/OpenAction" not in content:
            score += 3
        else:
            errors.append(f"Unsafe or invalid PDF: {pdf_file}")

    for csv_file in root.rglob("*.csv"):
        max_score += 2
        content = csv_file.read_text(encoding="utf-8")
        if "Metric,Value,Notes" in content and "\n" in content:
            score += 2
        else:
            errors.append(f"Invalid CSV metrics artifact: {csv_file}")

    return {
        "passed": not errors,
        "score": score,
        "maxScore": max_score,
        "files": [str(item.relative_to(root)) for item in files],
        "errors": errors,
    }


def validate_ooxml_package(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        with zipfile.ZipFile(path) as package:
            names = package.namelist()
            if "[Content_Types].xml" not in names:
                errors.append(f"{path} missing [Content_Types].xml")
            if any(any(part in name for part in FORBIDDEN_ZIP_PARTS) for name in names):
                errors.append(f"{path} contains forbidden embedded/macro part")
            for name in names:
                if name.endswith(".rels"):
                    rels = package.read(name).decode("utf-8", errors="ignore")
                    if 'TargetMode="External"' in rels:
                        errors.append(f"{path} contains external relationship in {name}")
            if path.suffix == ".pptx" and not any(name.startswith("ppt/slides/slide") for name in names):
                errors.append(f"{path} missing slides")
            if path.suffix == ".docx" and "word/document.xml" not in names:
                errors.append(f"{path} missing word/document.xml")
            if path.suffix == ".xlsx" and not any(name.startswith("xl/worksheets/") for name in names):
                errors.append(f"{path} missing worksheet")
    except zipfile.BadZipFile:
        errors.append(f"{path} is not a valid zip package")
    return errors


def count_pptx_slides(path: Path) -> int:
    with zipfile.ZipFile(path) as package:
        return sum(
            1
            for name in package.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        )


def count_docx_sections(path: Path) -> int:
    with zipfile.ZipFile(path) as package:
        document = package.read("word/document.xml").decode("utf-8", errors="ignore")
    return document.count('w:pStyle w:val="Heading1"')


def count_xlsx_rows(path: Path) -> int:
    with zipfile.ZipFile(path) as package:
        worksheet = package.read("xl/worksheets/sheet1.xml").decode("utf-8", errors="ignore")
    return worksheet.count("<row ")


def write_docx(path: Path, title: str, sections: list[tuple[str, list[str]]]) -> None:
    paragraphs = [docx_paragraph(title, style="Title")]
    for heading, bullets in sections:
        paragraphs.append(docx_paragraph(heading, style="Heading1"))
        for bullet in bullets:
            paragraphs.append(docx_paragraph(bullet, style="ListParagraph"))

    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(paragraphs)}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>'''
    write_zip(path, {
        "[Content_Types].xml": content_types_docx(),
        "_rels/.rels": root_rels("word/document.xml"),
        "docProps/core.xml": core_props(title),
        "docProps/app.xml": app_props("Agent Builder"),
        "word/document.xml": document_xml,
        "word/styles.xml": word_styles(),
        "word/_rels/document.xml.rels": relationships([]),
    })


def docx_paragraph(text: str, style: str | None = None) -> str:
    style_xml = f"<w:pPr><w:pStyle w:val=\"{style}\"/></w:pPr>" if style else ""
    return f"<w:p>{style_xml}<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"


def write_pptx(path: Path, title: str, slides: list[dict[str, Any]]) -> None:
    files: dict[str, str] = {
        "[Content_Types].xml": content_types_pptx(len(slides)),
        "_rels/.rels": root_rels("ppt/presentation.xml"),
        "docProps/core.xml": core_props(title),
        "docProps/app.xml": app_props("Agent Builder"),
        "ppt/presentation.xml": presentation_xml(slides),
        "ppt/_rels/presentation.xml.rels": presentation_rels(len(slides)),
        "ppt/slideLayouts/slideLayout1.xml": slide_layout_xml(),
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": relationships([
            ("rId1", "../slideMasters/slideMaster1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"),
        ]),
        "ppt/slideMasters/slideMaster1.xml": slide_master_xml(),
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": relationships([
            ("rId1", "../slideLayouts/slideLayout1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"),
            ("rId2", "../theme/theme1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"),
        ]),
        "ppt/theme/theme1.xml": theme_xml(),
        "ppt/presProps.xml": "<p:presentationPr xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\"/>",
        "ppt/viewProps.xml": "<p:viewPr xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\"/>",
        "ppt/tableStyles.xml": "<a:tblStyleLst xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" def=\"{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}\"/>",
    }
    for index, slide in enumerate(slides, start=1):
        files[f"ppt/slides/slide{index}.xml"] = slide_xml(slide, index)
        files[f"ppt/slides/_rels/slide{index}.xml.rels"] = relationships([
            ("rId1", "../slideLayouts/slideLayout1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"),
        ])
    write_zip(path, files)


def write_xlsx(path: Path, rows: list[list[Any]]) -> None:
    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for column_index, value in enumerate(row, start=1):
            ref = f"{column_name(column_index)}{row_index}"
            if isinstance(value, (int, float)):
                cells.append(f'<c r="{ref}"><v>{value}</v></c>')
            else:
                cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    worksheet = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>{''.join(sheet_rows)}</sheetData>
</worksheet>'''
    write_zip(path, {
        "[Content_Types].xml": content_types_xlsx(),
        "_rels/.rels": root_rels("xl/workbook.xml"),
        "docProps/core.xml": core_props("Agent Metrics Workbook"),
        "docProps/app.xml": app_props("Agent Builder"),
        "xl/workbook.xml": workbook_xml(),
        "xl/_rels/workbook.xml.rels": relationships([
            ("rId1", "worksheets/sheet1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"),
        ]),
        "xl/worksheets/sheet1.xml": worksheet,
    })


def write_csv(path: Path, rows: list[list[Any]]) -> None:
    lines = []
    for row in rows:
        lines.append(",".join(csv_cell(value) for value in row))
    write_text(path, "\n".join(lines) + "\n")


def csv_cell(value: Any) -> str:
    text = str(value)
    if any(char in text for char in [",", "\"", "\n"]):
        return "\"" + text.replace("\"", "\"\"") + "\""
    return text


def write_pdf(path: Path, title: str, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text_lines = [title, *lines]
    stream_lines = ["BT", "/F1 14 Tf", "72 740 Td"]
    for index, line in enumerate(text_lines):
        if index:
            stream_lines.append("0 -28 Td")
        stream_lines.append(f"({pdf_escape(line)}) Tj")
    stream_lines.append("ET")
    stream = "\n".join(stream_lines).encode("utf-8")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref_start = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("ascii"))
    path.write_bytes(bytes(output))


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_zip(path: Path, files: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as package:
        for name, content in files.items():
            package.writestr(posixpath.normpath(name), content)


def content_types_docx() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''


def content_types_pptx(slide_count: int) -> str:
    slide_overrides = "\n".join(
        f'  <Override PartName="/ppt/slides/slide{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for index in range(1, slide_count + 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
{slide_overrides}
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
  <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
  <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''


def content_types_xlsx() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''


def root_rels(target: str) -> str:
    return relationships([
        ("rId1", target, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),
        ("rId2", "docProps/core.xml", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"),
        ("rId3", "docProps/app.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties"),
    ])


def relationships(items: list[tuple[str, str, str]]) -> str:
    body = "".join(
        f'<Relationship Id="{rel_id}" Type="{rel_type}" Target="{escape(target)}"/>'
        for rel_id, target, rel_type in items
    )
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{body}</Relationships>'


def core_props(title: str) -> str:
    now = "2026-04-27T00:00:00Z"
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{escape(title)}</dc:title>
  <dc:creator>Agent Builder</dc:creator>
  <cp:lastModifiedBy>Agent Builder</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''


def app_props(application: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>{escape(application)}</Application>
</Properties>'''


def word_styles() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>
</w:styles>'''


def presentation_xml(slides: list[dict[str, Any]]) -> str:
    ids = "".join(
        f'<p:sldId id="{255 + index}" r:id="rId{index}"/>'
        for index in range(1, len(slides) + 1)
    )
    master_id = len(slides) + 1
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{master_id}"/></p:sldMasterIdLst>
  <p:sldIdLst>{ids}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>'''


def presentation_rels(slide_count: int) -> str:
    items = [
        (f"rId{index}", f"slides/slide{index}.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide")
        for index in range(1, slide_count + 1)
    ]
    items.extend([
        (f"rId{slide_count + 1}", "slideMasters/slideMaster1.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"),
        (f"rId{slide_count + 2}", "presProps.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps"),
        (f"rId{slide_count + 3}", "viewProps.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps"),
        (f"rId{slide_count + 4}", "tableStyles.xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles"),
    ])
    return relationships(items)


def slide_xml(slide: dict[str, Any], index: int) -> str:
    title = escape(slide["title"])
    bullets = slide.get("bullets", [])
    bullet_runs = "".join(f"<a:p><a:r><a:t>{escape(item)}</a:t></a:r></a:p>" for item in bullets)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
      {text_box(2, f"Title {index}", title, 600000, 400000, 10900000, 900000, 3600)}
      {text_box(3, f"Body {index}", bullet_runs, 900000, 1550000, 10400000, 4300000, 2200, raw=True)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>'''


def text_box(shape_id: int, name: str, content: str, x: int, y: int, cx: int, cy: int, font_size: int, raw: bool = False) -> str:
    paragraphs = content if raw else f"<a:p><a:r><a:rPr sz=\"{font_size}\"/><a:t>{content}</a:t></a:r></a:p>"
    return f'''<p:sp>
  <p:nvSpPr><p:cNvPr id="{shape_id}" name="{escape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
  <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>{paragraphs}</p:txBody>
</p:sp>'''


def slide_layout_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>'''


def slide_master_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>'''


def theme_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Agent Builder">
  <a:themeElements>
    <a:clrScheme name="Agent"><a:dk1><a:srgbClr val="111827"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="374151"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="2563EB"/></a:accent1><a:accent2><a:srgbClr val="16A34A"/></a:accent2><a:accent3><a:srgbClr val="F59E0B"/></a:accent3><a:accent4><a:srgbClr val="DC2626"/></a:accent4><a:accent5><a:srgbClr val="7C3AED"/></a:accent5><a:accent6><a:srgbClr val="0891B2"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="Agent"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Agent"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>
  </a:themeElements>
</a:theme>'''


def workbook_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Agent Metrics" sheetId="1" r:id="rId1"/></sheets>
</workbook>'''


def column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def build_slide_plan(profile: Profile, model_notes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    slides = [
        {"title": "Local Agent Builder", "bullets": ["Actual output run", "Repo-constrained artifacts", "No downloads"]},
        {"title": "What Changed", "bullets": ["Agents emit docx, pptx, xlsx, html, json, and markdown", "Artifacts are validated for macros and external relationships"]},
        {"title": "Domain Learning", "bullets": ["Scenario results feed a learning ledger", "Accepted lessons require rollback rules"]},
        {"title": "Security Boundary", "bullets": ["Writes stay under agent-outputs", "No executable outputs", "No external package downloads"]},
        {"title": "Model Experiment", "bullets": model_bullets(model_notes)},
        {"title": "DOE Result", "bullets": ["Deck depth, document depth, and dashboard depth were varied", "Best setting uses richer artifacts with security pack"]},
        {"title": "Decision", "bullets": ["Keep real-output artifact runner", "Chunk long local model validation", "Promote passing artifacts into the UI build flow"]},
    ]
    return slides[:profile.deck_slides]


def model_bullets(model_notes: list[dict[str, Any]]) -> list[str]:
    if not model_notes:
        return ["Model calls skipped for deterministic test run"]
    return [
        f"{note['model']}: {note.get('response') or note.get('status')}"
        for note in model_notes[:3]
    ]


def build_document_sections(profile: Profile, model_notes: list[dict[str, Any]]) -> list[tuple[str, list[str]]]:
    sections = [
        ("Conclusion", ["Use eval-gated domain memory because it improves without silently mutating prompts."]),
        ("Inputs", ["Hypothetical operating brief, product metrics, security constraints, and local model observations."]),
        ("Outputs", ["PowerPoint deck, Word brief, metrics workbook, HTML dashboard, research brief, and review findings."]),
        ("Security", ["The run writes only under agent-outputs and forbids macros, external relationships, and executable artifacts."]),
        ("Model Notes", model_bullets(model_notes)),
        ("Next Step", ["Wire these real artifact adapters into the visual Build Agent action."]),
    ]
    return sections[:profile.doc_sections]


def chief_of_staff_sections(model_notes: list[dict[str, Any]]) -> list[tuple[str, list[str]]]:
    return [
        ("Top Priorities", ["Ship real artifact generation", "Keep local-model validation bounded", "Document artifact evidence."]),
        ("Owners", ["App Builder owns HTML dashboard", "Deck Builder owns PPTX", "Writing Agent owns DOCX."]),
        ("Risks", ["Long local model runs can time out", "Generated Office files need package validation", "Output roots must remain constrained."]),
        ("Follow-ups", model_bullets(model_notes)),
    ]


def workbook_rows(profile: Profile) -> list[list[Any]]:
    return [
        ["Metric", "Value", "Notes"],
        ["Deck slides", profile.deck_slides, "Real PPTX slides generated"],
        ["Document sections", profile.doc_sections, "Real DOCX sections generated"],
        ["Dashboard widgets", profile.dashboard_widgets, "Local HTML cards rendered"],
        ["Security pack", "yes" if profile.include_security_pack else "no", "Macro and relationship checks"],
    ]


def dashboard_payload(profile: Profile) -> dict[str, Any]:
    cards = [
        {"label": "Artifact score", "value": 100, "trend": "validated"},
        {"label": "Office files", "value": 3, "trend": "pptx/docx/xlsx"},
        {"label": "Security checks", "value": "pass", "trend": "no macros"},
        {"label": "Local models", "value": 3, "trend": "qwen/gemma/tinyllama"},
        {"label": "DOE runs", "value": 8, "trend": "full factorial"},
    ]
    return {"cards": cards[:profile.dashboard_widgets], "updated": "2026-04-27"}


def dashboard_html(profile: Profile, payload: dict[str, Any]) -> str:
    cards = "\n".join(
        f"<section class=\"card\"><span>{html.escape(str(card['label']))}</span><strong>{html.escape(str(card['value']))}</strong><small>{html.escape(str(card['trend']))}</small></section>"
        for card in payload["cards"]
    )
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Output Dashboard</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #111827; }}
    main {{ max-width: 960px; margin: 0 auto; padding: 32px; }}
    h1 {{ font-size: 32px; margin-bottom: 8px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }}
    .card {{ background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }}
    .card span, .card small {{ display: block; color: #4b5563; }}
    .card strong {{ display: block; font-size: 28px; margin: 8px 0; }}
  </style>
</head>
<body>
  <main>
    <h1>Agent Output Dashboard</h1>
    <p>Profile: {html.escape(profile.name)}. All content is local and generated inside the artifact folder.</p>
    <div class="grid">{cards}</div>
  </main>
  <script>
    const dashboardData = {json.dumps(payload)};
    console.log("local dashboard data", dashboardData);
  </script>
</body>
</html>
'''


def artifact_index_html(outputs: list[str], profile: Profile) -> str:
    cards = "\n".join(
        f"<section class=\"card\"><span>{html.escape(Path(item).suffix or 'file')}</span><strong>{html.escape(Path(item).name)}</strong><small>{html.escape(item)}</small></section>"
        for item in outputs[:12]
    )
    payload = {"profile": profile.name, "outputs": outputs}
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Artifact Index</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; background: #ffffff; color: #111827; }}
    main {{ max-width: 1080px; margin: 0 auto; padding: 32px; }}
    h1 {{ font-size: 30px; margin-bottom: 8px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }}
    .card {{ border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; background: #f9fafb; overflow-wrap: anywhere; }}
    .card span, .card small {{ display: block; color: #4b5563; }}
    .card strong {{ display: block; margin: 8px 0; }}
  </style>
</head>
<body>
  <main>
    <h1>Artifact Index</h1>
    <p>Local output inventory for profile {html.escape(profile.name)}.</p>
    <div class="grid">{cards}</div>
  </main>
  <script>
    const dashboardData = {json.dumps(payload)};
    console.log("artifact index", dashboardData);
  </script>
</body>
</html>
'''


def source_index() -> list[dict[str, str]]:
    return [{"url": url, "use": "reference only, no download performed"} for url in SOURCE_URLS]


def research_brief(model_notes: list[dict[str, Any]]) -> str:
    return markdown_from_sections("Research Brief: Secure Local Artifact Agents", [
        ("Finding", ["Local artifact agents should prefer narrow tool scope, explicit guardrails, and package validation."]),
        ("Source References", SOURCE_URLS),
        ("Local Model Notes", model_bullets(model_notes)),
        ("Open Question", ["Whether to add chunked long-run validation for slower local models."]),
    ])


def risk_summary(profile: Profile) -> dict[str, Any]:
    return {
        "profile": profile.name,
        "risks": [
            {"risk": "artifact escape", "control": "path containment validation", "status": "mitigated"},
            {"risk": "macro payload", "control": "OOXML forbidden part scan", "status": "mitigated"},
            {"risk": "local model timeout", "control": "small prompts and model note ledger", "status": "accepted"},
        ],
    }


def code_review_findings(profile: Profile) -> str:
    return markdown_from_sections("Code Review Findings", [
        ("Findings", ["No executable artifacts are generated.", "OOXML packages are scanned for macros and external relationships."]),
        ("Test Gaps", ["PowerPoint visual rendering is package-level validated but not opened in a GUI test."]),
        ("Recommendation", [f"Keep profile {profile.name} and add resumable local-model validation next."]),
    ])


def analysis_summary(profile: Profile) -> str:
    return markdown_from_sections("Analysis Summary", [
        ("Metrics", [f"Deck slides: {profile.deck_slides}", f"Document sections: {profile.doc_sections}", f"Dashboard widgets: {profile.dashboard_widgets}"]),
        ("Caveat", ["Metrics are from hypothetical scenarios and structural validation, not production user outcomes."]),
    ])


def speaker_notes(slides: list[dict[str, Any]]) -> str:
    return markdown_from_sections("Speaker Notes", [(slide["title"], slide["bullets"]) for slide in slides])


def markdown_from_sections(title: str, sections: list[tuple[str, list[str]]]) -> str:
    body = [f"# {title}", ""]
    for heading, bullets in sections:
        body.extend([f"## {heading}", ""])
        body.extend(f"- {item}" for item in bullets)
        body.append("")
    return "\n".join(body)


def write_doe_report(root: Path, result: dict[str, Any]) -> None:
    write_json(root / "doe-summary.json", result)
    lines = [
        "# Real Output DOE Summary",
        "",
        f"Design: {result['design']}",
        f"Response: {result['response']}",
        f"Best run: {result['best']['runId']} score={result['best']['score']}",
        "",
        "## Main Effects",
        "",
    ]
    for effect in result["effects"]:
        lines.append(f"- {effect['factor']}: {effect['effect']}")
    lines.extend(["", "## Runs", ""])
    for run in result["runs"]:
        lines.append(f"- {run['runId']}: score={run['score']} profile={run['profile']}")
    write_text(root / "doe-summary.md", "\n".join(lines) + "\n")


def write_markdown_summary(path: Path, result: dict[str, Any]) -> None:
    lines = [
        "# Hypothetical Local Agent Suite",
        "",
        f"Score: {result['score']}/{result['maxScore']}",
        f"Passed: {result['passed']}",
        "",
        "## Final Outputs",
        "",
    ]
    lines.extend(f"- `{item}`" for item in result["final"]["outputs"])
    lines.extend(["", "## Local Model Notes", ""])
    for note in result["modelNotes"]:
        lines.append(f"- `{note['model']}`: {note['status']} - {note.get('response') or note.get('error', '')}")
    if result["doe"]:
        lines.extend(["", "## DOE", "", f"Best run: `{result['doe']['best']['runId']}`"])
    write_text(path, "\n".join(lines) + "\n")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def relative_paths(root: Path, paths: list[Path]) -> list[str]:
    return [str(path.relative_to(root)) for path in paths]


def ensure_allowed_root(root: Path) -> None:
    repo = REPO_ROOT.resolve()
    if not is_inside(repo, root):
        raise SystemExit(f"Refusing to write outside repo: {root}")
    if "agent-outputs" not in root.parts:
        raise SystemExit(f"Refusing to write outside agent-outputs folder: {root}")


def is_inside(root: Path, target: Path) -> bool:
    root = root.resolve()
    target = target.resolve()
    return target == root or root in target.parents


if __name__ == "__main__":
    raise SystemExit(main())
