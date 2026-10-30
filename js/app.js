const $ = (s) => document.querySelector(s),
  W = 3200,
  H = 2200,
  cv = $("#cv"),
  ws = $("#ws"),
  ln = $("#ln"),
  NS = "http://www.w3.org/2000/svg";
const uid = () => Math.random().toString(36).slice(2, 9),
  clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let S = null,
  z = 10,
  saveT;
try {
  const r = localStorage.getItem("caseboard");
  if (r) S = JSON.parse(r);
} catch (e) {}
if (!S || !S.cards) {
  S = {
    cards: [
      {
        id: "a",
        type: "note",
        x: 1300,
        y: 900,
        rot: -2,
        title: "The victim",
        text: "Last seen leaving the library at 9pm.",
      },
      {
        id: "b",
        type: "note",
        x: 1700,
        y: 800,
        rot: 2,
        title: "Suspect A",
        text: "Says they were home all night. Nobody can confirm.",
      },
      {
        id: "c",
        type: "note",
        x: 1550,
        y: 1180,
        rot: -1,
        title: "Muddy footprint",
        text: "Found by the back door. Size 9.",
      },
    ],
    links: [
      { id: "l1", a: "a", b: "b", label: "argued" },
      { id: "l2", a: "b", b: "c", label: "same size?" },
    ],
  };
}
function msg(t) {
  const s = $("#st");
  s.textContent = t;
  s.title = t;
}
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      localStorage.setItem("caseboard", JSON.stringify(S));
      msg("Saved on this device");
    } catch (e) {
      msg("Storage is full. Use Backup to keep your board.");
    }
  }, 300);
}
const el = (id) => cv.querySelector('.card[data-id="' + id + '"]');
const card = (id) => S.cards.find((c) => c.id === id);
function pinPos(c) {
  const e = el(c.id);
  return { x: c.x + (e ? e.offsetWidth : 200) / 2, y: c.y + 2 };
}
function curve(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y),
    sag = Math.min(90, d * 0.12 + 18);
  return {
    d: `M${a.x} ${a.y}Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag} ${b.x} ${b.y}`,
    mx: (a.x + b.x) / 2,
    my: (a.y + b.y) / 2 + sag / 2,
  };
}
function mkSvg(t, at) {
  const n = document.createElementNS(NS, t);
  for (const k in at) n.setAttribute(k, at[k]);
  return n;
}
function drawLinks() {
  ln.replaceChildren();
  badges();
  drawMap();
  S.links.forEach((l) => {
    const A = card(l.a),
      B = card(l.b);
    if (!A || !B) return;
    const c = curve(pinPos(A), pinPos(B));
    const h = mkSvg("path", { d: c.d, class: "hit" });
    h.addEventListener("click", (e) => openPop(l, e));
    ln.append(
      h,
      mkSvg("path", {
        d: c.d,
        class: "str",
        style:
          "stroke:" +
          (l.col || "var(--string)") +
          (l.dash ? ";stroke-dasharray:9 7" : ""),
      }),
    );
    if (l.label) {
      const t = mkSvg("text", { x: c.mx, y: c.my - 8 });
      t.textContent = l.label;
      ln.append(t);
    }
  });
}
function fit(t) {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + "px";
}
function mk(c) {
  const d = document.createElement("div");
  d.className = "card " + c.type + (IMG.includes(c.type) ? " photo" : "");
  d.dataset.id = c.id;
  d.style.left = c.x + "px";
  d.style.top = c.y + "px";
  d.style.zIndex = ++z;
  d.style.setProperty("--r", c.rot + "deg");
  d.innerHTML =
    '<button class="x" title="Delete card" aria-label="Delete card">×</button><div class="pin" title="Drag this pin onto another card to link"></div><button class="lk" title="Link this card to another">Link</button><button class="cl" title="Change paper color" aria-label="Change paper color"></button><button class="rd" title="Redact notes (click again to reveal)" aria-label="Redact notes"></button><button class="fd" title="Fold or unfold this card" aria-label="Fold card">–</button><button class="sb" title="Stamp this card">Stamp</button><div class="stamp" hidden></div><div class="deg" hidden></div>' +
    (IMG.includes(c.type)
      ? '<img alt=""><button class="fl">Color</button>'
      : "") +
    (c.type === "sketch"
      ? '<canvas class="sk" width="380" height="260"></canvas><button class="skc">Clear</button>'
      : "") +
    '<input class="t" aria-label="Title"><textarea class="b" rows="1" aria-label="Notes"></textarea><div class="ex"></div><div class="addbar"><span>Add</span><button data-k="Date" data-t="date">Date</button><button data-k="Place" data-t="text">Place</button><button data-k="Person" data-t="text">Person</button><button data-k="" data-t="text">Other</button></div>';
  const t = d.querySelector(".t"),
    b = d.querySelector(".b");
  const ph = IMG.includes(c.type) || c.type === "sketch";
  t.placeholder =
    {
      sticky: "Reminder",
      clip: "Headline",
      receipt: "Store / item",
      mugshot: "Suspect name",
      bag: "Evidence label",
    }[c.type] || (ph ? "Caption" : "Title");
  b.placeholder = ph
    ? "Add a note"
    : c.type === "clip"
      ? "Article text…"
      : "Write what you know…";
  t.value = c.title || "";
  b.value = c.text || "";
  if (c.img) {
    const im = d.querySelector("img");
    if (im) im.src = c.img;
  }
  c.f = c.f || [];
  const ex = d.querySelector(".ex");
  const addRow = (f, focus) => {
    const r = document.createElement("div");
    r.className = "fr";
    const k = document.createElement("input"),
      v = document.createElement("input"),
      x = document.createElement("button");
    k.className = "fk";
    k.placeholder = "Label";
    k.value = f.k;
    k.setAttribute("aria-label", "Detail name");
    v.className = "fv";
    v.type = f.t === "date" ? "date" : "text";
    v.value = f.v;
    v.setAttribute("aria-label", "Detail value");
    x.className = "fx";
    x.textContent = "×";
    x.title = "Remove detail";
    x.setAttribute("aria-label", "Remove detail");
    k.oninput = () => {
      f.k = k.value;
      save();
    };
    v.oninput = () => {
      f.v = v.value;
      save();
    };
    x.onclick = () => {
      c.f = c.f.filter((q) => q !== f);
      r.remove();
      save();
    };
    r.append(k, v, x);
    ex.append(r);
    if (focus) (f.k ? v : k).focus();
  };
  c.f.forEach((f) => addRow(f));
  d.querySelectorAll(".addbar button").forEach(
    (bt) =>
      (bt.onclick = () => {
        const f = { k: bt.dataset.k, v: "", t: bt.dataset.t };
        c.f.push(f);
        addRow(f, 1);
        save();
      }),
  );
  t.oninput = () => {
    c.title = t.value;
    save();
  };
  b.oninput = () => {
    c.text = b.value;
    fit(b);
    save();
  };
  d.querySelector(".lk").onclick = (e) => {
    if (lm && lm !== c.id) return;
    setLM(lm === c.id ? null : c.id);
  };
  d.classList.toggle("red", !!c.rd);
  d.querySelector(".rd").onclick = () => {
    c.rd = !c.rd;
    d.classList.toggle("red", c.rd);
    save();
  };
  const cvn = d.querySelector("canvas.sk"),
    g = cvn && cvn.getContext && cvn.getContext("2d");
  if (g) {
    g.lineWidth = 3;
    g.lineCap = "round";
    g.strokeStyle = "#2a2420";
    if (c.img) {
      const im = new Image();
      im.onload = () => g.drawImage(im, 0, 0);
      im.src = c.img;
    }
    cvn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (document.body.classList.contains("locked")) return;
      const r = cvn.getBoundingClientRect(),
        k = cvn.width / r.width;
      let px = (e.clientX - r.left) * k,
        py = (e.clientY - r.top) * k;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + 0.1, py);
      g.stroke();
      cvn.setPointerCapture(e.pointerId);
      const mv = (v) => {
        const x = (v.clientX - r.left) * k,
          y = (v.clientY - r.top) * k;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(x, y);
        g.stroke();
        px = x;
        py = y;
      };
      const up = () => {
        cvn.removeEventListener("pointermove", mv);
        cvn.removeEventListener("pointerup", up);
        c.img = cvn.toDataURL("image/png");
        save();
      };
      cvn.addEventListener("pointermove", mv);
      cvn.addEventListener("pointerup", up);
    });
    d.querySelector(".skc").onclick = () => {
      g.clearRect(0, 0, cvn.width, cvn.height);
      c.img = "";
      save();
    };
  }
  const fdb = d.querySelector(".fd");
  d.classList.toggle("fold", !!c.fold);
  if (c.fold) fdb.textContent = "+";
  fdb.onclick = () => {
    c.fold = !c.fold;
    d.classList.toggle("fold", c.fold);
    fdb.textContent = c.fold ? "+" : "–";
    save();
  };
  const stp = d.querySelector(".stamp"),
    showSt = () => {
      const s = stampOf(c);
      stp.textContent = s;
      stp.hidden = !s;
    };
  showSt();
  d.querySelector(".sb").onclick = () => openStamp(c, d, showSt);
  if (c.col) d.style.background = PAPER[c.col];
  const fl = d.querySelector(".fl");
  if (fl) {
    const FL = [
        ["Color", "none"],
        ["B&W", "grayscale(1) contrast(1.1)"],
        ["Sepia", "sepia(1)"],
        ["Blur", "blur(7px)"],
      ],
      ap = () => {
        const f = FL[c.flt || 0];
        fl.textContent = f[0];
        d.style.setProperty("--f", f[1]);
      };
    ap();
    fl.onclick = () => {
      c.flt = ((c.flt || 0) + 1) % FL.length;
      ap();
      save();
    };
  }
  d.querySelector(".cl").onclick = () => {
    c.col = ((c.col || 0) + 1) % PAPER.length;
    d.style.background = c.col ? PAPER[c.col] : "";
    save();
  };
  d.addEventListener("click", () => {
    if (lm && lm !== c.id) {
      link(lm, c.id);
      setLM(null);
    }
  });
  d.querySelector(".x").onclick = () => {
    snap();
    sel.delete(c.id);
    setTimeout(paintSel, 0);
    S.cards = S.cards.filter((k) => k !== c);
    S.links = S.links.filter((l) => l.a !== c.id && l.b !== c.id);
    d.remove();
    drawLinks();
    save();
  };
  d.addEventListener("pointerdown", (e) => {
    if (e.target.closest("input,textarea,button,.pin")) return;
    e.stopPropagation();
    d.style.zIndex = ++z;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      toggleSel(c.id);
      return;
    }
    if (document.body.classList.contains("locked")) return;
    if (!sel.has(c.id)) clearSel();
    const grp =
        sel.size > 1 && sel.has(c.id)
          ? [...sel].map(card).filter(Boolean)
          : [c],
      st0 = grp.map((k) => [k.x, k.y]);
    const sx = e.clientX,
      sy = e.clientY;
    d.setPointerCapture(e.pointerId);
    d.classList.add("lift");
    const mv = (v) => {
      const dx = v.clientX - sx,
        dy = v.clientY - sy;
      grp.forEach((k, i) => {
        const n = el(k.id);
        k.x = clamp(st0[i][0] + dx, 0, W - n.offsetWidth);
        k.y = clamp(st0[i][1] + dy, 0, H - n.offsetHeight);
        n.style.left = k.x + "px";
        n.style.top = k.y + "px";
      });
      drawLinks();
    };
    const up = () => {
      d.removeEventListener("pointermove", mv);
      d.removeEventListener("pointerup", up);
      d.classList.remove("lift");
      save();
    };
    d.addEventListener("pointermove", mv);
    d.addEventListener("pointerup", up);
  });
  d.querySelector(".pin").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    const tmp = mkSvg("path", { class: "str", style: "opacity:.7" });
    ln.append(tmp);
    const pt = (v) => {
      const r = cv.getBoundingClientRect();
      return { x: v.clientX - r.left, y: v.clientY - r.top };
    };
    const mv = (v) => {
      tmp.setAttribute("d", curve(pinPos(c), pt(v)).d);
    };
    const up = (v) => {
      removeEventListener("pointermove", mv);
      removeEventListener("pointerup", up);
      tmp.remove();
      const o = document
        .elementFromPoint(v.clientX, v.clientY)
        ?.closest(".card");
      if (o && o.dataset.id !== c.id) {
        const id = o.dataset.id;
        if (
          !S.links.some(
            (l) => (l.a === c.id && l.b === id) || (l.a === id && l.b === c.id),
          )
        ) {
          S.links.push({ id: uid(), a: c.id, b: id, label: "" });
          drawLinks();
          save();
        }
      }
    };
    addEventListener("pointermove", mv);
    addEventListener("pointerup", up);
  });
  cv.append(d);
  fit(b);
  return d;
}
function add(type, x, y, img) {
  const c = {
    id: uid(),
    type,
    x: 0,
    y: 0,
    rot: +(Math.random() * 6 - 3).toFixed(1),
    title: "",
    text: "",
    img,
  };
  const w = type === "photo" ? 200 : 210;
  c.x = clamp(
    x == null
      ? ws.scrollLeft + ws.clientWidth / 2 - w / 2 + Math.random() * 80 - 40
      : x - w / 2,
    0,
    W - w,
  );
  c.y = clamp(
    y == null
      ? ws.scrollTop + ws.clientHeight / 2 - 100 + Math.random() * 80 - 40
      : y,
    0,
    H - 260,
  );
  S.cards.push(c);
  const d = mk(c);
  save();
  drawLinks();
  if (!IMG.includes(type) && type !== "sketch") d.querySelector(".t").focus();
  return c;
}
function addImage(file, x, y, ty) {
  if (!file || !file.type.startsWith("image/")) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const m = 700,
        s = Math.min(1, m / Math.max(im.width, im.height)),
        k = document.createElement("canvas");
      k.width = Math.round(im.width * s);
      k.height = Math.round(im.height * s);
      const g = k.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, k.width, k.height);
      g.drawImage(im, 0, 0, k.width, k.height);
      const c = add(ty || "photo", x, y, k.toDataURL("image/jpeg", 0.8));
      setTimeout(drawLinks, 60);
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}
let pop = null;
function closePop() {
  if (pop) {
    pop.remove();
    pop = null;
  }
}
function openPop(l, e) {
  closePop();
  const r = cv.getBoundingClientRect();
  pop = document.createElement("div");
  pop.className = "pop";
  pop.style.left = clamp(e.clientX - r.left - 90, 0, W - 300) + "px";
  pop.style.top = e.clientY - r.top + 10 + "px";
  pop.innerHTML =
    '<input placeholder="Label this link" aria-label="Link label"><button>Cut string</button><button class="dsh">Dashed</button><button class="swb" data-c="#b3261e" style="background:#b3261e" aria-label="Red string"></button><button class="swb" data-c="#1d1a18" style="background:#1d1a18" aria-label="Black string"></button><button class="swb" data-c="#2a5d9f" style="background:#2a5d9f" aria-label="Blue string"></button><button class="swb" data-c="#c9922b" style="background:#c9922b" aria-label="Gold string"></button>';
  const i = pop.querySelector("input");
  i.value = l.label || "";
  i.oninput = () => {
    l.label = i.value;
    drawLinks();
    save();
  };
  i.onkeydown = (k) => {
    if (k.key === "Enter") closePop();
  };
  pop.querySelector("button").onclick = () => {
    snap();
    S.links = S.links.filter((k) => k !== l);
    closePop();
    drawLinks();
    save();
  };
  pop.querySelectorAll(".swb").forEach(
    (b) =>
      (b.onclick = () => {
        l.col = b.dataset.c;
        drawLinks();
        save();
      }),
  );
  const ds = pop.querySelector(".dsh");
  ds.textContent = l.dash ? "Solid" : "Dashed";
  ds.onclick = () => {
    l.dash = !l.dash;
    ds.textContent = l.dash ? "Solid" : "Dashed";
    drawLinks();
    save();
  };
  pop.addEventListener("pointerdown", (e) => e.stopPropagation());
  cv.append(pop);
  i.focus();
}
cv.addEventListener("dblclick", (e) => {
  if (e.target !== cv && e.target !== ln) return;
  const r = cv.getBoundingClientRect();
  add("note", e.clientX - r.left, e.clientY - r.top - 20);
});
ws.addEventListener("pointerdown", (e) => {
  if (e.target !== cv && e.target !== ln && e.target !== ws) return;
  closePop();
  setLM(null);
  if (!e.shiftKey) clearSel();
  if (selMode) {
    bandStart(e);
    return;
  }
  if (e.pointerType !== "mouse") return;
  const sx = e.clientX,
    sy = e.clientY,
    l = ws.scrollLeft,
    t = ws.scrollTop;
  const mv = (v) => {
    ws.scrollLeft = l - (v.clientX - sx);
    ws.scrollTop = t - (v.clientY - sy);
  };
  const up = () => {
    removeEventListener("pointermove", mv);
    removeEventListener("pointerup", up);
  };
  addEventListener("pointermove", mv);
  addEventListener("pointerup", up);
});
$("#bn").onclick = () => add("note");
$("#bp").onclick = () => {
  pendType = "photo";
  $("#fi").click();
};
$("#fi").onchange = (e) => {
  [...e.target.files].forEach((f) =>
    addImage(f, undefined, undefined, pendType),
  );
  pendType = "photo";
  e.target.value = "";
};
addEventListener("paste", (e) => {
  const it = [...(e.clipboardData?.items || [])].find((i) =>
    i.type.startsWith("image/"),
  );
  if (it) {
    e.preventDefault();
    addImage(it.getAsFile());
  }
});
ws.addEventListener("dragover", (e) => e.preventDefault());
ws.addEventListener("drop", (e) => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  [...e.dataTransfer.files].forEach((f, i) =>
    addImage(f, e.clientX - r.left + i * 30, e.clientY - r.top - 80 + i * 30),
  );
});
let ct;
$("#bc").onclick = function () {
  if (this.dataset.arm) {
    clearTimeout(ct);
    delete this.dataset.arm;
    this.textContent = "Clear board";
    snap();
    S = { cards: [], links: [] };
    renderAll();
    save();
  } else {
    this.dataset.arm = 1;
    this.textContent = "Click again to clear";
    ct = setTimeout(() => {
      delete this.dataset.arm;
      this.textContent = "Clear board";
    }, 3000);
  }
};
const dl = $("#dl"),
  dt = $("#dt");
$("#bb").onclick = () => {
  dt.value = JSON.stringify(S);
  $("#dm").textContent = "";
  dl.hidden = false;
  dt.focus();
  dt.select();
};
$("#dcl").onclick = () => {
  dl.hidden = true;
};
$("#dcp").onclick = () => {
  dt.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  $("#dm").textContent = ok ? "Copied" : "Press Ctrl+C to copy";
};
$("#dld").onclick = () => {
  try {
    const o = JSON.parse(dt.value);
    if (!Array.isArray(o.cards) || !Array.isArray(o.links)) throw 0;
    snap();
    S = o;
    renderAll();
    save();
    dl.hidden = true;
  } catch (e) {
    $("#dm").textContent = "That isn’t a valid backup";
  }
};
addEventListener("keydown", (e) => {
  const ty = e.target.closest && e.target.closest("input,textarea"),
    mod = e.ctrlKey || e.metaKey,
    k = e.key.toLowerCase();
  if (k === "escape") {
    closeMenus();
    closePop();
    setLM(null);
    clearSel();
    dl.hidden = true;
    $("#rp").hidden = true;
    if (tr) untrace();
  }
  if (mod && k === "z" && !ty) {
    e.preventDefault();
    undo();
  }
  if (mod && k === "a" && !ty) {
    e.preventDefault();
    selAll();
  }
  if (mod && k === "d" && !ty) {
    e.preventDefault();
    dupSel();
  }
  if ((k === "delete" || k === "backspace") && !ty && sel.size) {
    e.preventDefault();
    delSel();
  }
  if (
    k === "n" &&
    !ty &&
    !mod &&
    !e.altKey &&
    !document.body.classList.contains("locked")
  ) {
    e.preventDefault();
    add("note");
  }
});
let lm = null;
function setLM(id) {
  lm = id;
  cv.classList.toggle("lm", !!id);
  cv.querySelectorAll(".card").forEach((n) =>
    n.classList.toggle("src", n.dataset.id === id),
  );
  msg(id ? "Now click the card to link it to. Esc cancels." : "");
}
function link(a, b) {
  if (S.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)))
    return;
  snap();
  tone(660, 0.08, "triangle", 0.08);
  S.links.push({ id: uid(), a, b, label: "" });
  drawLinks();
  save();
}
const U = [];
function snap() {
  U.push(JSON.stringify(S));
  if (U.length > 8) U.shift();
  $("#bu").disabled = false;
}
function renderAll() {
  $("#ct").value = S.title || "";
  setLock(!!S.locked, false);
  setTheme(S.theme || 0);
  cv.querySelectorAll(".card").forEach((n) => n.remove());
  S.cards.forEach(mk);
  drawLinks();
  setTimeout(drawLinks, 60);
  applyQ();
  [...sel].forEach((i) => {
    if (!card(i)) sel.delete(i);
  });
  paintSel();
}
function undo() {
  if (!U.length || document.body.classList.contains("locked")) return;
  S = JSON.parse(U.pop());
  renderAll();
  save();
  $("#bu").disabled = !U.length;
}
$("#bu").onclick = undo;
const hp = $("#hp");
try {
  if (!localStorage.getItem("cb_help")) hp.hidden = false;
} catch (e) {
  hp.hidden = false;
}
$("#hx").onclick = () => {
  hp.hidden = true;
  try {
    localStorage.setItem("cb_help", "1");
  } catch (e) {}
};
$("#bh").onclick = () => {
  hp.hidden = !hp.hidden;
};
const IMG = ["photo", "mugshot", "bag"];
let pendType = "photo";
document.querySelectorAll(".nt").forEach(
  (b) =>
    (b.onclick = () => {
      const t = b.dataset.t;
      if (t === "mugshot" || t === "bag") {
        pendType = t;
        $("#fi").click();
      } else add(t);
    }),
);
let snd = false,
  ac;
function tone(f, d, t, v) {
  if (!snd) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(),
      g = ac.createGain();
    o.type = t || "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(v || 0.05, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}
$("#bz").onclick = () => {
  snd = !snd;
  $("#bz").textContent = "Sound: " + (snd ? "on" : "off");
  tone(440, 0.1, "triangle", 0.08);
};
const TH = [
  ["cork", "Cork"],
  ["chalk", "Chalkboard"],
  ["blue", "Blueprint"],
  ["noir", "Noir"],
];
function setTheme(i) {
  S.theme = i;
  TH.forEach((t) => cv.classList.remove(t[0]));
  cv.classList.add(TH[i][0]);
  $("#bg").textContent = "Board: " + TH[i][1];
}
$("#bg").onclick = () => {
  setTheme(((S.theme || 0) + 1) % TH.length);
  save();
};
setTheme(S.theme || 0);
$("#bj").onclick = () => {
  const ids = [...sel];
  if (ids.length < 2) {
    msg("Select two or more cards first");
    return;
  }
  snap();
  let n = 0;
  for (let i = 1; i < ids.length; i++) {
    const a = ids[i - 1],
      b = ids[i];
    if (
      !S.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))
    ) {
      S.links.push({ id: uid(), a, b, label: "" });
      n++;
    }
  }
  drawLinks();
  save();
  setTimeout(() => msg("Added " + n + " strings, chained in order"), 450);
};
function dupSel() {
  if (!sel.size || document.body.classList.contains("locked")) return;
  snap();
  const m = {};
  [...sel].forEach((id) => {
    const c = card(id);
    if (!c) return;
    const n = JSON.parse(JSON.stringify(c));
    n.id = uid();
    n.x = clamp(c.x + 40, 0, W - 220);
    n.y = clamp(c.y + 40, 0, H - 260);
    m[id] = n.id;
    S.cards.push(n);
    mk(n);
  });
  S.links
    .filter((l) => m[l.a] && m[l.b])
    .forEach((l) =>
      S.links.push(Object.assign({}, l, { id: uid(), a: m[l.a], b: m[l.b] })),
    );
  sel.clear();
  Object.values(m).forEach((i) => sel.add(i));
  drawLinks();
  paintSel();
  save();
}
$("#bq").onclick = dupSel;
function closeMenus() {
  document.querySelectorAll(".mp").forEach((p) => (p.hidden = true));
  document
    .querySelectorAll(".mb")
    .forEach((b) => b.setAttribute("aria-expanded", "false"));
}
document.querySelectorAll(".menu").forEach((m) => {
  const b = m.querySelector(".mb"),
    p = m.querySelector(".mp");
  b.onclick = (e) => {
    e.stopPropagation();
    const open = p.hidden;
    closeMenus();
    if (open) {
      p.style.left = "0";
      p.hidden = false;
      b.setAttribute("aria-expanded", "true");
      const r = p.getBoundingClientRect();
      if (r.right > innerWidth - 8)
        p.style.left = innerWidth - 8 - r.right + "px";
    }
  };
  p.addEventListener("click", (e) => {
    if (!(e.target.id === "bc" && e.target.dataset.arm)) closeMenus();
  });
});
addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".menu")) closeMenus();
});
function setLock(v, show) {
  S.locked = v;
  document.body.classList.toggle("locked", v);
  $("#bk").textContent = v ? "Unlock" : "Lock";
  if (v && show) {
    const k = document.createElement("div");
    k.className = "closed";
    k.textContent = "CASE CLOSED";
    tone(70, 0.5, "sawtooth", 0.2);
    document.body.append(k);
    setTimeout(() => k.remove(), 2000);
  }
}
$("#bk").onclick = () => {
  setLock(!S.locked, true);
  if (S.locked) clearSel();
  save();
};
setLock(!!S.locked, false);
let tr = false;
function untrace() {
  tr = false;
  applyQ();
}
$("#bl").onclick = () => {
  if (tr) {
    untrace();
    return;
  }
  if (sel.size !== 1) {
    msg("Select one card first, then press Trace");
    return;
  }
  const seen = new Set([...sel]);
  let ch = true;
  while (ch) {
    ch = false;
    S.links.forEach((l) => {
      if (seen.has(l.a) && !seen.has(l.b)) {
        seen.add(l.b);
        ch = true;
      }
      if (seen.has(l.b) && !seen.has(l.a)) {
        seen.add(l.a);
        ch = true;
      }
    });
  }
  tr = true;
  cv.querySelectorAll(".card").forEach((n) =>
    n.classList.toggle("dim", !seen.has(n.dataset.id)),
  );
  msg(seen.size + " cards connect to this one. Press Esc to clear.");
};
$("#br").onclick = () => {
  const L = [
    (S.title || "Untitled case").toUpperCase(),
    "==============================",
    "",
  ];
  const dd = (c) =>
    ((c.f || []).find((f) => f.t === "date" && f.v) || {}).v || "";
  [...S.cards]
    .sort((a, b) => (dd(a) || "9999").localeCompare(dd(b) || "9999"))
    .forEach((c, i) => {
      L.push(
        i +
          1 +
          ". " +
          (c.title || "Untitled") +
          (stampOf(c) ? "  [" + stampOf(c) + "]" : ""),
      );
      (c.f || []).forEach((f) => {
        if (f.v) L.push("   " + (f.k || "Detail") + ": " + f.v);
      });
      if (c.text) L.push("   " + c.text.replace(/\n/g, "\n   "));
      const ls = S.links
        .filter((l) => l.a === c.id || l.b === c.id)
        .map((l) => {
          const o = card(l.a === c.id ? l.b : l.a);
          return (
            (o && o.title ? o.title : "Untitled") +
            (l.label ? " (" + l.label + ")" : "")
          );
        });
      if (ls.length) L.push("   Linked to: " + ls.join(", "));
      L.push("");
    });
  $("#rpx").value = L.join("\n");
  $("#rp").hidden = false;
  $("#rpm").textContent = "";
};
$("#rpc").onclick = () => {
  $("#rpx").select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  $("#rpm").textContent = ok ? "Copied" : "Press Ctrl+C to copy";
};
$("#rpz").onclick = () => {
  $("#rp").hidden = true;
};
const fx = $("#fx");
$("#bf").onclick = () => {
  fx.hidden = !fx.hidden;
  fx.style.top = $("header").offsetHeight + "px";
  $("#bf").textContent = fx.hidden ? "Flashlight" : "Lights on";
};
addEventListener("pointermove", (e) => {
  if (!fx.hidden) {
    fx.style.setProperty("--mx", e.clientX + "px");
    fx.style.setProperty("--my", e.clientY - fx.offsetTop + "px");
  }
});
function badges() {
  const n = {};
  S.links.forEach((l) => {
    n[l.a] = (n[l.a] || 0) + 1;
    n[l.b] = (n[l.b] || 0) + 1;
  });
  const mx = Math.max(0, ...Object.values(n));
  cv.querySelectorAll(".card").forEach((e) => {
    const k = n[e.dataset.id] || 0,
      b = e.querySelector(".deg");
    if (!b) return;
    b.hidden = !k;
    b.textContent = k + (k === 1 ? " string" : " strings");
    e.classList.toggle("hot", mx >= 3 && k === mx);
  });
}
function drawMap() {
  const m = $("#mm");
  if (!m) return;
  const s = 176 / W;
  m.replaceChildren();
  S.cards.forEach((c) => {
    const i = document.createElement("i");
    i.style.left = c.x * s + "px";
    i.style.top = c.y * s + "px";
    m.append(i);
  });
  const v = document.createElement("b");
  Object.assign(v.style, {
    left: ws.scrollLeft * s + "px",
    top: ws.scrollTop * s + "px",
    width: ws.clientWidth * s + "px",
    height: ws.clientHeight * s + "px",
  });
  m.append(v);
}
ws.addEventListener("scroll", drawMap);
addEventListener("resize", drawMap);
const mm = $("#mm"),
  jump = (e) => {
    const r = mm.getBoundingClientRect(),
      s = 176 / W;
    ws.scrollLeft = (e.clientX - r.left) / s - ws.clientWidth / 2;
    ws.scrollTop = (e.clientY - r.top) / s - ws.clientHeight / 2;
  };
mm.onpointerdown = (e) => {
  e.preventDefault();
  jump(e);
  mm.setPointerCapture(e.pointerId);
  mm.onpointermove = jump;
};
mm.onpointerup = () => {
  mm.onpointermove = null;
};
const plate = $("#ct");
plate.value = S.title || "";
plate.oninput = () => {
  S.title = plate.value;
  save();
};
$("#bx").onclick = () => {
  if (S.cards.length < 2) return;
  snap();
  const P = S.cards.map((c) => ({
      c,
      x: c.x + 100,
      y: c.y + 90,
      vx: 0,
      vy: 0,
    })),
    M = {};
  P.forEach((p) => (M[p.c.id] = p));
  for (let it = 0; it < 260; it++) {
    P.forEach((a) =>
      P.forEach((b) => {
        if (a === b) return;
        const dx = a.x - b.x,
          dy = a.y - b.y,
          d = Math.hypot(dx, dy) || 1;
        if (d < 420) {
          const f = (420 - d) * 0.05;
          a.vx += (dx / d) * f;
          a.vy += (dy / d) * f;
        }
      }),
    );
    S.links.forEach((l) => {
      const a = M[l.a],
        b = M[l.b];
      if (!a || !b) return;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy) || 1,
        f = (d - 300) * 0.02;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    });
    P.forEach((p) => {
      p.vx += (1600 - p.x) * 0.002;
      p.vy += (1100 - p.y) * 0.002;
      p.x += p.vx * 0.5;
      p.y += p.vy * 0.5;
      p.vx *= 0.8;
      p.vy *= 0.8;
    });
  }
  P.forEach((p) => {
    p.c.x = clamp(Math.round(p.x - 100), 0, W - 220);
    p.c.y = clamp(Math.round(p.y - 90), 170, H - 260);
    const e = el(p.c.id);
    e.style.left = p.c.x + "px";
    e.style.top = p.c.y + "px";
  });
  drawLinks();
  save();
  setTimeout(() => msg("Untangled. Undo puts everything back."), 450);
};
$("#bs").onclick = () => {
  if (!S.cards.length) return;
  snap();
  const x0 = ws.scrollLeft,
    y0 = ws.scrollTop,
    w = Math.max(300, ws.clientWidth - 260),
    h = Math.max(300, ws.clientHeight - 300);
  S.cards.forEach((c) => {
    c.x = clamp(Math.round(x0 + Math.random() * w), 0, W - 220);
    c.y = clamp(Math.round(y0 + 60 + Math.random() * h), 0, H - 260);
    c.rot = +(Math.random() * 16 - 8).toFixed(1);
    const e = el(c.id);
    e.style.left = c.x + "px";
    e.style.top = c.y + "px";
    e.style.setProperty("--r", c.rot + "deg");
  });
  drawLinks();
  save();
  setTimeout(() => msg("Evidence scattered. Undo puts it back."), 450);
};
const sel = new Set();
let selMode = false;
function paintSel() {
  const k = sel.size;
  cv.querySelectorAll(".card").forEach((n) =>
    n.classList.toggle("sel", sel.has(n.dataset.id)),
  );
  $("#ba").textContent =
    k && k === S.cards.length ? "Deselect all" : "Select all";
  const b = $("#bd");
  b.hidden = !k;
  b.textContent = "Delete " + k + " selected";
}
function clearSel() {
  sel.clear();
  paintSel();
}
function selAll() {
  S.cards.forEach((c) => sel.add(c.id));
  paintSel();
}
function toggleSel(id) {
  sel.has(id) ? sel.delete(id) : sel.add(id);
  paintSel();
}
function delSel() {
  if (!sel.size || document.body.classList.contains("locked")) return;
  snap();
  S.cards = S.cards.filter((c) => !sel.has(c.id));
  S.links = S.links.filter((l) => card(l.a) && card(l.b));
  sel.clear();
  renderAll();
  save();
}
$("#ba").onclick = () => {
  S.cards.length && sel.size === S.cards.length ? clearSel() : selAll();
};
$("#bd").onclick = delSel;
$("#bm").onclick = () => {
  selMode = !selMode;
  ws.classList.toggle("sm", selMode);
  ws.style.touchAction = selMode ? "none" : "";
  $("#bm").textContent = selMode ? "Mode: Select" : "Mode: Drag";
  msg(
    selMode
      ? "Drag on empty space to box-select cards. Shift-click adds or removes one."
      : "Drag empty space to move the board.",
  );
};
function bandStart(e) {
  const r = cv.getBoundingClientRect(),
    x0 = e.clientX - r.left,
    y0 = e.clientY - r.top,
    b = document.createElement("div"),
    base = e.shiftKey ? new Set(sel) : new Set();
  b.className = "band";
  cv.append(b);
  const mv = (v) => {
    const x1 = v.clientX - r.left,
      y1 = v.clientY - r.top,
      l = Math.min(x0, x1),
      t = Math.min(y0, y1),
      w = Math.abs(x1 - x0),
      h = Math.abs(y1 - y0);
    Object.assign(b.style, {
      left: l + "px",
      top: t + "px",
      width: w + "px",
      height: h + "px",
    });
    sel.clear();
    base.forEach((i) => sel.add(i));
    S.cards.forEach((c) => {
      const n = el(c.id);
      if (
        n &&
        c.x < l + w &&
        c.x + n.offsetWidth > l &&
        c.y < t + h &&
        c.y + n.offsetHeight > t
      )
        sel.add(c.id);
    });
    paintSel();
  };
  const up = () => {
    removeEventListener("pointermove", mv);
    removeEventListener("pointerup", up);
    b.remove();
  };
  addEventListener("pointermove", mv);
  addEventListener("pointerup", up);
}
const PAPER = ["", "#f7e27a", "#f4b8c1", "#b9d6ee"],
  STAMPS = ["", "EVIDENCE", "SUSPECT", "ALIBI", "UNSOLVED", "CLOSED"];
const stampOf = (c) => (c.stx !== undefined ? c.stx : STAMPS[c.st || 0]);
function openStamp(c, d, show) {
  closePop();
  pop = document.createElement("div");
  pop.className = "pop sp";
  pop.style.left = clamp(c.x, 0, W - 280) + "px";
  pop.style.top = c.y + d.offsetHeight + 8 + "px";
  pop.innerHTML =
    '<div class="hd"><b>Stamp this card</b><button class="cx" aria-label="Cancel" title="Cancel and undo changes">×</button></div><input maxlength="24" placeholder="Type your own stamp" aria-label="Stamp text"><div class="chips">' +
    STAMPS.slice(1)
      .map((s) => '<button class="pre">' + s + "</button>")
      .join("") +
    '</div><div class="ft"><button class="rm">Remove stamp</button><button class="ok">Done</button></div>';
  const i = pop.querySelector("input");
  i.value = stampOf(c);
  const was = stampOf(c);
  const set = (v) => {
    c.stx = v.trim();
    show();
    save();
  };
  i.oninput = () => set(i.value);
  i.onkeydown = (k) => {
    if (k.key === "Enter") closePop();
  };
  pop.querySelector(".ok").onclick = closePop;
  pop.querySelector(".cx").onclick = () => {
    c.stx = was;
    show();
    save();
    closePop();
  };
  pop.querySelector(".rm").onclick = () => {
    i.value = "";
    set("");
    closePop();
  };
  pop.querySelectorAll(".pre").forEach(
    (b) =>
      (b.onclick = () => {
        i.value = b.textContent;
        set(b.textContent);
        tone(110, 0.2, "sawtooth", 0.12);
      }),
  );
  pop.addEventListener("pointerdown", (e) => e.stopPropagation());
  cv.append(pop);
  i.focus();
  i.select();
}
function applyQ() {
  const q = $("#sq").value.trim().toLowerCase();
  cv.querySelectorAll(".card").forEach((n) => {
    const c = card(n.dataset.id),
      m = [
        c.title,
        c.text,
        stampOf(c),
        ...(c.f || []).map((f) => f.k + " " + f.v),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    n.classList.toggle("dim", !!q && !m);
    n.classList.toggle("hit2", !!q && m);
  });
}
$("#sq").oninput = applyQ;
$("#bt").onclick = () => {
  const D = S.cards
    .map((c) => ({ c, d: (c.f || []).find((f) => f.t === "date" && f.v) }))
    .filter((o) => o.d)
    .sort((a, b) => a.d.v.localeCompare(b.d.v));
  if (!D.length) {
    msg("Add a Date to some notes first");
    return;
  }
  snap();
  D.forEach((o, i) => {
    o.c.x = 300 + (i % 8) * 270;
    o.c.y = 200 + Math.floor(i / 8) * 420;
    const e = el(o.c.id);
    e.style.left = o.c.x + "px";
    e.style.top = o.c.y + "px";
  });
  drawLinks();
  save();
  ws.scrollTo({ left: 100, top: 60, behavior: "smooth" });
  setTimeout(
    () =>
      msg(
        "Lined up " +
          D.length +
          " dated notes, oldest first. Undo puts them back.",
      ),
    450,
  );
};
S.cards.forEach(mk);
document.fonts &&
  document.fonts.ready.then(() => {
    S.cards.forEach((c) => {
      const b = el(c.id)?.querySelector(".b");
      if (b) fit(b);
    });
    drawLinks();
  });
drawLinks();
ws.scrollLeft = 1100;
ws.scrollTop = 700;
