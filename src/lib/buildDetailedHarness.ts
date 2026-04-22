/** Extract all assert lines from a testCode string */
export function extractAssertLines(testCode: string): string[] {
    return testCode
        .split('\n')
        .filter(line => line.trim().startsWith('assert '));
}

/**
 * Build a Python harness that runs each assertion individually.
 * On first failure, prints JSON: {"ok":false,"index":N,"input":"...","expected":"...","actual":"..."}
 * On all pass, prints JSON: {"ok":true}
 *
 * The "input" field is formatted as "param = value\nparam2 = value2" using inspect.signature
 * so it matches LeetCode's display style.
 *
 * @param allowAnyOrder - if true, list-of-list outputs are normalized before comparison
 *   (outer order and inner order ignored). Use for problems like 3Sum where order doesn't matter.
 *   Problems opt in by including "# ALLOW_ANY_ORDER" anywhere in their testCode.
 */
export function buildDetailedHarness(
    promptCode: string,
    userCode: string,
    assertLines: string[],
    allowAnyOrder: boolean = false
): string {
    // Encode assert lines as base64 JSON to avoid any escaping issues in the Python source
    const assertLinesB64 = Buffer.from(JSON.stringify(assertLines)).toString('base64');
    const normalizeBlock = allowAnyOrder ? `\
            def _normalize(_v):
                if isinstance(_v, list) and _v and isinstance(_v[0], list):
                    try:
                        return sorted([sorted(_x) for _x in _v])
                    except TypeError:
                        pass
                return _v
            _cmp_actual, _cmp_expected = _normalize(_actual), _normalize(_expected)` :
        `            _cmp_actual, _cmp_expected = _actual, _expected`;

    return `${promptCode}

${userCode}

import inspect as _inspect, json as _json, ast as _ast, base64 as _b64

_sol = Solution()
_methods = [m for m, _ in _inspect.getmembers(_sol, predicate=_inspect.ismethod) if not m.startswith('_')]
_candidate = getattr(_sol, _methods[0])
_assert_lines = _json.loads(_b64.b64decode("${assertLinesB64}").decode())

def _run_assert(_idx, _line):
    _line = _line.strip()
    if not _line.startswith('assert '):
        return None
    _expr = _line[7:]
    try:
        _tree = _ast.parse(_expr, mode='eval')
        _node = _tree.body
        if isinstance(_node, _ast.Compare) and len(_node.ops) == 1 and isinstance(_node.ops[0], _ast.Eq):
            _left = _node.left
            _exp_str = _ast.unparse(_node.comparators[0])
            _call_str = _ast.unparse(_left)
            _actual = eval(_call_str, {'candidate': _candidate})
            _expected = eval(_exp_str, {})
            # Try to format input with parameter names (LeetCode style)
            _input_repr = _call_str
            if isinstance(_left, _ast.Call):
                try:
                    _sig = _inspect.signature(_candidate)
                    _params = list(_sig.parameters.keys())
                    _arg_vals = [eval(_ast.unparse(a), {}) for a in _left.args]
                    _kw_vals = {kw.arg: eval(_ast.unparse(kw.value), {}) for kw in _left.keywords}
                    _parts = []
                    for _pi, _pname in enumerate(_params):
                        if _pi < len(_arg_vals):
                            _parts.append(f"{_pname} = {repr(_arg_vals[_pi])}")
                        elif _pname in _kw_vals:
                            _parts.append(f"{_pname} = {repr(_kw_vals[_pname])}")
                    if _parts:
                        _input_repr = '\\n'.join(_parts)
                except Exception:
                    pass
${normalizeBlock}
            if _cmp_actual != _cmp_expected:
                return {'ok': False, 'index': _idx, 'input': _input_repr, 'expected': repr(_expected), 'actual': repr(_actual)}
            return None
        else:
            _r = eval(_expr, {'candidate': _candidate})
            if not _r:
                return {'ok': False, 'index': _idx, 'input': _expr, 'expected': 'True', 'actual': 'False'}
            return None
    except AssertionError:
        return {'ok': False, 'index': _idx, 'input': _expr, 'expected': 'pass', 'actual': 'AssertionError'}
    except Exception as _e:
        return {'ok': False, 'index': _idx, 'input': _expr, 'expected': '', 'actual': f'Error: {_e}'}

_failed = None
for _i, _line in enumerate(_assert_lines):
    _r = _run_assert(_i, _line)
    if _r is not None:
        _failed = _r
        break
print(_json.dumps(_failed if _failed else {'ok': True}))
`;
}
