"""Lizard quality gate. Source metrics are enforced; test metrics are reported."""
import importlib.metadata
import json
from pathlib import Path
import sys
import lizard


def analyze(root, limits, enforce):
    records, violations = [], []
    for path in sorted(root.rglob('*')):
        if path.suffix not in {'.ts', '.js', '.mjs'}:
            continue
        info = lizard.analyze_file(str(path))
        record = {'file': path.as_posix(), 'nloc': info.nloc, 'functions': []}
        if enforce and info.nloc > limits['maxFileNloc']:
            violations.append(f'{path}: file NLOC {info.nloc} > {limits["maxFileNloc"]}')
        for function in info.function_list:
            entry = {'name': function.name, 'line': function.start_line,
                     'nloc': function.nloc, 'ccn': function.cyclomatic_complexity}
            record['functions'].append(entry)
            if enforce and entry['ccn'] > limits['maxCcn']:
                violations.append(f'{path}:{entry["line"]} {entry["name"]}: CCN {entry["ccn"]} > {limits["maxCcn"]}')
            if enforce and entry['nloc'] > limits['maxFunctionNloc']:
                violations.append(f'{path}:{entry["line"]} {entry["name"]}: NLOC {entry["nloc"]} > {limits["maxFunctionNloc"]}')
        records.append(record)
    return records, violations


def main():
    limits = json.loads(Path(__file__).with_name('limits.json').read_text())
    version = importlib.metadata.version('lizard')
    if version != limits['lizardVersion']:
        raise RuntimeError(f'Expected Lizard {limits["lizardVersion"]}, found {version}')
    production, violations = analyze(Path('src'), limits, True)
    tests, _ = analyze(Path('test'), limits, False)
    if not production:
        violations.append('No production source files found; refusing an empty gate.')
    report = {'tool': 'lizard', 'version': version, 'variant': 'standard CCN',
              'limits': limits, 'production': production, 'tests': tests, 'violations': violations}
    Path('artifacts').mkdir(exist_ok=True)
    Path('artifacts/lizard.json').write_text(json.dumps(report, indent=2) + '\n')
    for violation in violations:
        print(violation, file=sys.stderr)
    print(f'Lizard: {len(production)} production files, {len(tests)} test files, {len(violations)} violations')
    return 1 if violations else 0


if __name__ == '__main__':
    sys.exit(main())
