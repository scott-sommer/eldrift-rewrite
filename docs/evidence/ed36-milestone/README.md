# ED-36 milestone archives

See ../ed36-milestone.json for source, commands, assertions, hashes and CI. Native source d2bd05b passes63serial cases; prior-e03f08c attempt history is separately classified as a failed campaign. Raw .json.gz and .log.gz preserve original bytes; JSONL files expose domain/measurement observations. These artifacts do not establish production soak or complete release parity.

Run python tools/evidence/verify_archives.py docs/evidence/ed36-milestone.json --published from the repository root to verify committed bytes independently of checkout line endings.
