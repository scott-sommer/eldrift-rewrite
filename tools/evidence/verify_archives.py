"""Verify source-qualified native archives and JSONL observations, optionally from committed Git bytes."""
import gzip
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUBLISHED = '--published' in sys.argv
counts = {'raw': 0, 'rows': 0}

def read(name):
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Archive path escapes repository: ' + name)
    if PUBLISHED:
        return subprocess.check_output(['git', 'show', 'HEAD:' + path.relative_to(ROOT).as_posix()], cwd=ROOT)
    return path.read_bytes()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def verify_raw(node):
    encoded = read(node['rawFile'])
    assert digest(encoded) == node['rawSha256'], node['rawFile']
    raw = gzip.decompress(encoded) if node.get('rawEncoding') == 'gzip' else encoded
    assert digest(raw) == node.get('uncompressedSha256', node['rawSha256']), node['rawFile']
    if 'nativeSource' in node:
        evidence = json.loads(raw)
        assert evidence['provenance']['commit'] == node['nativeSource'], node['rawFile']
        assert evidence['provenance']['dirty'] is False, node['rawFile']
        assert evidence['status'] == node['expectedStatus'], node['rawFile']
    counts['raw'] += 1

def verify_rows(node):
    data = read(node['rowsFile'])
    assert digest(data) == node['rowsSha256'], node['rowsFile']
    lines = data.splitlines()
    assert len(lines) == node['rows'], node['rowsFile']
    for line in lines:
        json.loads(line)
    counts['rows'] += 1

def walk(node):
    if isinstance(node, dict):
        if 'rawFile' in node:
            verify_raw(node)
        if 'rowsFile' in node:
            verify_rows(node)
        for value in node.values():
            walk(value)
    elif isinstance(node, list):
        for value in node:
            walk(value)

if __name__ == '__main__':
    manifest = next(value for value in sys.argv[1:] if value != '--published')
    walk(json.loads(read(manifest)))
    print(json.dumps({'verified': counts, 'published': PUBLISHED}))
