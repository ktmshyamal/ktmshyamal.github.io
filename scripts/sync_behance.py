#!/usr/bin/env python3
"""Keep the Work section in step with Behance.

1. Reads the public Behance RSS feed for the profile.
2. Any project not yet in data/projects.json is added at the top: its cover is
   downloaded to assets/work/, and a category is guessed from its title and text.
3. The Work cards in index.html (between the WORK:START / WORK:END markers) are
   rebuilt from data/projects.json.

Usage:
    python3 scripts/sync_behance.py            fetch Behance, update data and page
    python3 scripts/sync_behance.py --render   only rebuild the cards from data/projects.json

Edit data/projects.json by hand to change a title, subtitle, category or order,
or set "hidden": true to keep a project off the site. The sync never overwrites
those edits; it only adds projects it has not seen before.
"""
import html
import io
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data' / 'projects.json'
PAGE = ROOT / 'index.html'
WORK_DIR = ROOT / 'assets' / 'work'
FEED = 'https://www.behance.net/feeds/user?username=ktmshyamal'
UA = 'Mozilla/5.0 (compatible; portfolio-sync; +https://ktmshyamal.github.io/)'

CATEGORIES = {'branding': 'Branding', 'motion': 'Motion', 'automotive': 'Automotive', 'social': 'AI &amp; Social'}
DEFAULT_KIND = {'branding': 'Branding', 'motion': 'Motion design', 'automotive': 'Automotive', 'social': 'Social media'}
# First match wins, so the more specific groups come first.
KEYWORDS = [
    ('automotive', r'\b(bus|buses|car|cars|auto|automotive|vehicle|fleet|higer|byd|amg|motor|motors|truck|suv)\b'),
    ('motion', r'motion|\b(intro|video|animation|animated|film|youtube|cinematic|reel|edit|edited)\b'),
    ('branding', r'\b(brand|branding|logo|identity|corporate|profile|brochure|packaging|print|stationery)\b'),
    ('social', r'\b(social|post|posts|linkedin|linkdin|instagram|facebook|tiktok|ai|campaign)\b'),
]
START, END = '<!-- WORK:START', '<!-- WORK:END -->'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def read_feed():
    root = ET.fromstring(fetch(FEED))
    items = []
    for it in root.iter('item'):
        link = (it.findtext('link') or '').strip()
        m = re.search(r'/gallery/(\d+)/', link)
        if not m:
            continue
        desc_html = it.findtext('description') or ''
        img = re.search(r"src=['\"]([^'\"]+)['\"]", desc_html)
        text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', desc_html))).strip()
        try:
            published = parsedate_to_datetime(it.findtext('pubDate')).date().isoformat()
        except Exception:
            published = ''
        title = (it.findtext('title') or '').strip()
        title = title.replace(' ? ', ' – ')  # the feed turns a dash into "?"
        items.append({'id': m.group(1), 'title': title, 'url': link, 'cover': img.group(1) if img else '',
                      'text': text, 'published': published})
    return items


def guess_category(title, text):
    # The title says most about the project, so it is checked on its own before the description.
    for hay in (title.lower(), f'{title} {text}'.lower()):
        for cat, pattern in KEYWORDS:
            if re.search(pattern, hay):
                return cat
    return 'social'


def slugify(title, taken):
    base = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:48] or 'project'
    slug, n = base, 2
    while slug in taken or (WORK_DIR / f'{slug}.jpg').exists():
        slug, n = f'{base}-{n}', n + 1
    return slug


def save_cover(url, slug):
    """Download the 808 px cover (same size as the existing cards) and store it as a JPEG."""
    big = re.sub(r'/projects/[^/]+/', '/projects/808/', url)
    try:
        raw = fetch(big)
    except Exception:
        raw = fetch(url)
    dest = WORK_DIR / f'{slug}.jpg'
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        if im.width > 808:
            im = im.resize((808, round(im.height * 808 / im.width)), Image.LANCZOS)
        im.save(dest, 'JPEG', quality=84, optimize=True, progressive=True)
    except ImportError:
        dest.write_bytes(raw)  # browsers sniff the real format, so a PNG named .jpg still shows
    return f'assets/work/{slug}.jpg'


def alt_text(title, text):
    if not text:
        return title
    first = re.split(r'(?<=[.!?])\s', text, maxsplit=1)[0]
    return first if len(first) <= 140 else first[:137].rsplit(' ', 1)[0] + '…'


def render(projects):
    esc = lambda s: html.escape(s, quote=True)
    cards = []
    for p in projects:
        if p.get('hidden'):
            continue
        cat = p['category'] if p['category'] in CATEGORIES else 'social'
        cards.append(
            f'''        <a class="card" data-cat="{cat}" href="{esc(p['url'])}" target="_blank" rel="noopener" aria-label="{esc(p['title'])}, {esc(p['kind'])}. Opens on Behance.">
          <span class="ph"><img src="{esc(p['image'])}" alt="{esc(p['alt'])}" loading="lazy" decoding="async" width="808" height="632"><span class="tag">{CATEGORIES[cat]}</span></span>
          <span class="meta"><span class="mt"><b>{esc(p['title'])}</b><i>{esc(p['kind'])}</i></span><span class="arr" aria-hidden="true">↗</span></span>
        </a>''')
    return '\n'.join(cards)


def write_page(projects):
    page = PAGE.read_text(encoding='utf-8')
    a = page.index(START)
    a = page.index('-->', a) + 3
    b = page.index(END)
    new = page[:a] + '\n' + render(projects) + '\n' + page[b:]
    if new != page:
        PAGE.write_text(new, encoding='utf-8')
        return True
    return False


def main():
    data = json.loads(DATA.read_text(encoding='utf-8'))
    projects = data['projects']
    added = []
    if '--render' not in sys.argv:
        try:
            feed = read_feed()
        except Exception as e:
            print(f'Could not read the Behance feed: {e}', file=sys.stderr)
            sys.exit(1)
        if not feed:
            print('The Behance feed came back empty; leaving the site as it is.', file=sys.stderr)
            sys.exit(1)
        known = {p['id'] for p in projects}
        taken = {Path(p['image']).stem for p in projects}
        for item in sorted((i for i in feed if i['id'] not in known), key=lambda i: i['published']):
            cat = guess_category(item['title'], item['text'])
            slug = slugify(item['title'], taken)
            taken.add(slug)
            image = save_cover(item['cover'], slug) if item['cover'] else ''
            if not image:
                continue
            projects.insert(0, {'id': item['id'], 'title': item['title'], 'kind': DEFAULT_KIND[cat], 'category': cat,
                                'url': item['url'], 'image': image, 'alt': alt_text(item['title'], item['text']),
                                'published': item['published'], 'source': 'behance'})
            added.append(item['title'])
        if added:
            DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    changed = write_page(projects)
    print('Added: ' + (', '.join(added) if added else 'nothing new'))
    print('Page ' + ('updated' if changed else 'unchanged'))


if __name__ == '__main__':
    main()
