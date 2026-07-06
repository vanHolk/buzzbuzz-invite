# Patch for existing bee pages (Nos. 01–06)

Two small edits so cross-linking stays complete. Safe to hand to Cursor verbatim.

## 1. Add the three new bees to every `.mini-grid`

In each of `normal.html`, `berry-blush.html`, `goblin.html`, `outlaw.html`, `aurora-prism.html`, `hani.html`, append these three cells **inside** the existing `<div class="mini-grid">`, after the last `.mini-cell`:

```html
          <a class="mini-cell" href="kpop-jimmy.html">
            <img src="img/kpop-jimmy.png" alt="Kpop Jimmy, a bee with a wavy blue perm and an idol headset mic" loading="lazy" width="480" height="480" />
            <span class="mini-name">Kpop Jimmy</span>
          </a>
          <a class="mini-cell" href="wizard-student.html">
            <img src="img/wizard-student.png" alt="Wizard Student, a bee wearing a black witch hat and a gold bell collar" loading="lazy" width="480" height="480" />
            <span class="mini-name">Wizard Student</span>
          </a>
          <a class="mini-cell" href="festival-bee.html">
            <img src="img/festival-bee.png" alt="Festival Bee, a bee with a white goatee wearing a star-spangled top hat, blue suit and red bow tie" loading="lazy" width="480" height="480" />
            <span class="mini-name">Festival Bee</span>
          </a>
```

(Each page's mini-grid omits the page's own bee — these three are new, so all six pages get all three cells.)

## 2. Fix the pager chain on `hani.html`

Hani is No. 06 and now has a next bee. In `hani.html`, point the `rel="next"` pager link at the new page:

```html
<a href="kpop-jimmy.html" rel="next" data-i18n="lbl.next">Next bee →</a>
```

The rest of the chain is already wired inside the new pages:
Hani → Kpop Jimmy → Wizard Student → Festival Bee → (loops to) Normal Bee.

## 3. Assets

Drop the three PNGs (480×480, same as the others) into `bees/img/`:
`kpop-jimmy.png`, `wizard-student.png`, `festival-bee.png`.

## 4. Deploy checklist

- [ ] Copy `bees/kpop-jimmy.html`, `bees/wizard-student.html`, `bees/festival-bee.html` into `bees/`
- [ ] Replace root `landing.html` and `sitemap.xml`
- [ ] Apply mini-grid + hani pager patches above
- [ ] Add the three PNGs to `bees/img/`
- [ ] Verify all 9 lore links from the landing carousel resolve on GitHub Pages
- [ ] (Optional) Request indexing for the three new URLs in Search Console — same low-authority crawl delay as before applies, so expect the sitemap to sit in "Couldn't fetch"/pending for a while; the Product Hunt-linked pages will pull crawlers in eventually.
