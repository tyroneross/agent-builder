# Artifact Safety Skill

## Purpose

Generate useful files without creating security or operational risk.

## Inputs

- Requested artifact.
- Allowed output root.
- Approved file types.
- Tool permissions.

## Outputs

- Safe artifact files.
- Manifest of generated files.
- Validation report.
- Blocked-action notes.

## Procedure

1. Write only inside the approved artifact root.
2. Reject executable-like outputs unless explicitly approved.
3. For Office files, use macro-free OOXML and scan package relationships.
4. For HTML, avoid external scripts, external links, and automatic network calls.
5. Validate each generated file before reporting success.

## Stop Conditions

- Output path escapes the allowed root.
- Artifact requires credentials or private data that were not provided.
- A tool tries to download code or execute an unapproved command.
