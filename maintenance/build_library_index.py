#!/usr/bin/env python3
"""Rebuild public/library-index.json from the Drive folders listed in the Library.

The index powers folder browsing and file search on the Library page. Run it
again whenever the Drive changes:

    python3 maintenance/build_library_index.py            # crawl 5 folder levels deep
    python3 maintenance/build_library_index.py --max-depth 6 --threads 8

It reads the Library folders from data/state.json, lists each Drive folder
through the public embedded folder view (no sign-in needed) and writes a compact
JSON file. Only folders that are shared with "anyone with the link" can be read.
"""
import argparse, html, json, os, re, sys, time, urllib.request
import concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_NAMES = re.compile(r'^(thumbs\.db|desktop\.ini|\.ds_store)$', re.I)
SKIP_EXT = re.compile(r'\.(exe|ini|db|tmp)$', re.I)


def fetch(folder_id):
    url = f'https://drive.google.com/embeddedfolderview?id={folder_id}'
    err = ''
    for _ in range(3):
        try:
            page = urllib.request.urlopen(url, timeout=30).read().decode('utf8', 'ignore')
            title = re.search(r'<title>([^<]*)', page)
            entries = []
            for m in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', page, re.S):
                n = re.search(r'flip-entry-title">([^<]*)', m.group(2))
                if not n:
                    continue
                link = html.unescape(m.group(1))
                fo = re.search(r'folders/([\w-]+)', link)
                fi = re.search(r'/file/d/([\w-]+)', link)
                entries.append({'n': html.unescape(n.group(1)).strip(), 'folder': fo.group(1) if fo else None, 'file': fi.group(1) if fi else None})
            return {'title': html.unescape(title.group(1)) if title else '', 'entries': entries}
        except Exception as e:  # network hiccup: retry
            err = str(e)
            time.sleep(2)
    return {'title': '', 'entries': [], 'error': err}


def crawl(seeds, max_depth, threads):
    tree, depth = {}, {s: 0 for s in seeds}
    todo = list(seeds)
    with cf.ThreadPoolExecutor(threads) as ex:
        while todo:
            batch = [i for i in todo if i not in tree]
            todo = []
            for i, res in zip(batch, ex.map(fetch, batch)):
                tree[i] = res
                if depth[i] < max_depth:
                    for e in res['entries']:
                        if e['folder'] and e['folder'] not in tree and e['folder'] not in depth:
                            depth[e['folder']] = depth[i] + 1
                            todo.append(e['folder'])
            print(f'  crawled {len(tree)} folders', flush=True)
    return tree


def norm(name):
    n = re.sub(r'\(\d+\)', '', name.lower()).replace('_', ' ')
    n = re.sub(r'\band\b', ' ', n)
    return re.sub(r'[^a-z0-9]', '', n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-depth', type=int, default=5)
    ap.add_argument('--threads', type=int, default=8)
    ap.add_argument('--cache', help='JSON file to save/load the raw crawl (speeds up reruns)')
    ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'library-index.json'))
    a = ap.parse_args()

    state = json.load(open(os.path.join(ROOT, 'data', 'state.json')))
    libs = []
    for f in state['library']:
        m = re.search(r'folders/([\w-]+)', f.get('url', ''))
        if m:
            libs.append({'id': f['id'], 'name': f['name'], 'drive': m.group(1)})

    if a.cache and os.path.exists(a.cache):
        tree = json.load(open(a.cache))
        print('using cached crawl', a.cache)
    else:
        tree = crawl([l['drive'] for l in libs], a.max_depth, a.threads)
        if a.cache:
            json.dump(tree, open(a.cache, 'w'), ensure_ascii=False)

    paths, path_idx = [], {}

    def pidx(p):
        if p not in path_idx:
            path_idx[p] = len(paths)
            paths.append(p)
        return path_idx[p]

    roots, files = [], []
    for ri, lib in enumerate(libs):
        seen = {}

        def build(fid, trail):
            node = tree.get(fid)
            if node is None:
                return None, 0, True
            count = 0
            kids = []
            for e in node['entries']:
                if e['folder']:
                    kid, c, unexplored = build(e['folder'], trail + [e['n']])
                    count += c
                    kids.append([e['n'], e['folder'], c, kid or [], 1 if unexplored else 0])
                elif e['file'] and not SKIP_NAMES.match(e['n']) and not SKIP_EXT.search(e['n']):
                    count += 1
                    key = e['n'].lower()
                    if key in seen:
                        files[seen[key]][4] += 1
                    else:
                        seen[key] = len(files)
                        files.append([ri, pidx(' > '.join(trail)), e['n'], e['file'], 1])
            # hide near-duplicate sibling folders (keep the larger one)
            groups = {}
            for k in kids:
                groups.setdefault(norm(k[0]), []).append(k)
            for g in groups.values():
                if len(g) > 1:
                    g.sort(key=lambda k: -k[2])
                    for k in g[1:]:
                        k[4] |= 2
            return kids, count, False

        kids, count, _ = build(lib['drive'], [])
        roots.append({'id': lib['id'], 'name': lib['name'], 'drive': lib['drive'], 'files': count, 'tree': kids or []})

    out = {'v': 1, 'built': time.strftime('%Y-%m-%d'), 'paths': paths, 'roots': roots, 'files': files}
    with open(a.out, 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'wrote {a.out}: {len(roots)} library folders, {len(files)} files, {os.path.getsize(a.out) // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())
