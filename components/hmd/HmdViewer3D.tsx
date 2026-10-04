"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   The LID & FEAR 9E418 3D viewer, opened from a button on every HMD page and
   on the LID and FEAR listings (Mario, 4 Oct 2026).

   ONE DEVICE ONLY: HMD TCT CLASSIC. Mario's rule — the demonstration never
   shows another model. The geometry is the SolidWorks assembly (HMD + LID +
   FEAR, meshed and packed into public/models/hmd-9e418.json, the same file the
   catalogue renders were made from), so the parts sit exactly where they fit.
   On the A.Craft and OP pages a line says so, so nobody reads the bare
   aluminium as their finish.

   NOTHING LOADS UNTIL THE BUTTON IS PRESSED: three.js and the 1.3 MB model are
   imported inside the effect, so the product page pays nothing for it.

   The look is the renders': brushed aluminium HMD, brushed steel lid disc,
   black matte silicone, on the 245 grey of the product photos.
--------------------------------------------------------------------------- */

type Parts = { lid: boolean; fear: boolean };

export default function HmdViewer3D({
  locale,
  initial,
  classicNote,
  onClose,
}: {
  locale: string;
  initial: Parts;
  classicNote: boolean;
  onClose: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ set: (p: Parts & { explode: boolean }) => void } | null>(null);
  const [parts, setParts] = useState<Parts>(initial);
  const [explode, setExplode] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const L = {
    title: t(locale, { en: "LID & FEAR 9E418 — 3D", uk: "LID & FEAR 9E418 — 3D", ja: "LID & FEAR 9E418 — 3D", ar: "LID & FEAR 9E418 — 3D" }),
    close: t(locale, { en: "Close 3D view", uk: "Закрити 3D-перегляд", ja: "3D表示を閉じる", ar: "إغلاق العرض ثلاثي الأبعاد" }),
    loading: t(locale, { en: "Loading 3D…", uk: "Завантаження 3D…", ja: "3D を読み込み中…", ar: "جارٍ تحميل العرض ثلاثي الأبعاد…" }),
    error: t(locale, { en: "3D could not load on this device.", uk: "Не вдалося завантажити 3D на цьому пристрої.", ja: "このデバイスでは3Dを読み込めませんでした。", ar: "تعذّر تحميل العرض ثلاثي الأبعاد على هذا الجهاز." }),
    explode: t(locale, { en: "Separate", uk: "Розібрати", ja: "分解", ar: "فصل" }),
    hint: t(locale, { en: "Drag to rotate · scroll or pinch to zoom", uk: "Тягніть, щоб обертати · прокрутка або щипок — масштаб", ja: "ドラッグで回転 · スクロール/ピンチで拡大", ar: "اسحب للتدوير · مرّر أو اقرص للتكبير" }),
    note: t(locale, { en: "Shown on HMD TCT Classic", uk: "Показано на HMD TCT Classic", ja: "HMD TCT Classic で表示しています", ar: "معروض على HMD TCT Classic" }),
  };

  /* Escape closes; the page behind does not scroll while the viewer is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        const ASM = await (await fetch("/models/hmd-9e418.json")).json();
        if (disposed || !mountRef.current) return;

        const mount = mountRef.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.setClearColor(0xf5f5f5, 1);
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.65;
        const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(90, 170, 125); scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(-125, 65, -60); scene.add(rim);

        const TAU = Math.PI * 2;
        const bytes = (b64: string) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
        const unpack = (part: { pos: string; nrm: string; idx: string }, uvMode: "planar" | null) => {
          const qp = new Int16Array(bytes(part.pos)), qn = new Int16Array(bytes(part.nrm)), ix = new Uint16Array(bytes(part.idx));
          const nv = qp.length / 3, pos = new Float32Array(qp.length), nrm = new Float32Array(qn.length), uv = new Float32Array(nv * 2);
          for (let i = 0; i < qp.length; i++) { pos[i] = qp[i] * ASM.scale; nrm[i] = qn[i] / 32767; }
          for (let v = 0; v < nv; v++) {
            const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
            if (uvMode === "planar") { uv[v * 2] = z / 74; uv[v * 2 + 1] = x / 74; }
            else { uv[v * 2] = Math.atan2(x, z) / TAU + 0.5; uv[v * 2 + 1] = y / 26; }
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
          g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
          g.setIndex(new THREE.BufferAttribute(ix, 1));
          g.computeBoundingBox();
          return g;
        };
        const brushed = (repeat: number) => {
          const c = document.createElement("canvas"); c.width = 8; c.height = 1024;
          const x = c.getContext("2d")!;
          let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          for (let y = 0; y < 1024; y++) {
            const v = Math.round(92 + (rnd() - 0.5) * 30 + (rnd() < 0.05 ? 26 : 0));
            x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, y, 8, 1);
          }
          const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, repeat); return tx;
        };
        const hmdMat = new THREE.MeshPhysicalMaterial({ color: "#c7cacd", metalness: 1, roughness: 1, roughnessMap: brushed(6) });
        const steelMat = new THREE.MeshPhysicalMaterial({ color: "#c3c5c7", metalness: 1, roughness: 1, roughnessMap: brushed(10) });
        const siliconeMat = new THREE.MeshPhysicalMaterial({ color: "#141517", metalness: 0, roughness: 0.78, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color("#3a3c40") });

        const model = new THREE.Group(); scene.add(model);
        const holder: Record<string, InstanceType<typeof THREE.Group>> = {};
        for (const [k, uvMode, mat] of [["hmd", null, hmdMat], ["lidSteel", "planar", steelMat], ["lidSilicone", null, siliconeMat], ["fear", null, siliconeMat]] as const) {
          const h = new THREE.Group();
          h.add(new THREE.Mesh(unpack(ASM[k], uvMode), mat));
          model.add(h); holder[k] = h;
        }

        /* The tct mark — not in the CAD, placed from the product photos. */
        {
          const CONE = [[16.55, 32.692], [17.3, 32.418], [18.05, 32.256], [25.55, 30.933], [26.0, 30.85]];
          const rAt = (y: number) => { for (let i = 0; i < CONE.length - 1; i++) { const [y0, r0] = CONE[i], [y1, r1] = CONE[i + 1]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return CONE[CONE.length - 1][1]; };
          const Y0 = 17.2, Y1 = 24.9, HALF = 5.25 / 31.75;
          const lc = document.createElement("canvas"); lc.width = 700; lc.height = 514;
          const x = lc.getContext("2d")!, lw = 30, p = lw / 2 + 6;
          x.strokeStyle = x.fillStyle = "#34373a"; x.lineWidth = lw;
          x.beginPath(); x.roundRect(p, p, 700 - 2 * p, 514 - 2 * p, 70); x.stroke();
          x.font = "700 296px Arial, Helvetica, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("tct", 350, 265);
          const tex = new THREE.CanvasTexture(lc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
          const pts = []; for (let k = 0; k <= 16; k++) { const y = Y0 + (Y1 - Y0) * k / 16; pts.push(new THREE.Vector2(rAt(y) + 0.04, y)); }
          const g = new THREE.LatheGeometry(pts, 28, -HALF, 2 * HALF), pp = g.attributes.position, uv = g.attributes.uv;
          for (let i = 0; i < pp.count; i++) uv.setXY(i, (Math.atan2(pp.getX(i), pp.getZ(i)) + HALF) / (2 * HALF), (pp.getY(i) - Y0) / (Y1 - Y0));
          uv.needsUpdate = true;
          holder.hmd.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.75, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })));
        }

        /* Soft contact shadow under the lowest part. */
        const sc = document.createElement("canvas"); sc.width = sc.height = 256;
        const sx = sc.getContext("2d")!, sg = sx.createRadialGradient(128, 128, 20, 128, 128, 128);
        sg.addColorStop(0, "rgba(0,0,0,0.22)"); sg.addColorStop(0.55, "rgba(0,0,0,0.12)"); sg.addColorStop(0.82, "rgba(0,0,0,0.03)"); sg.addColorStop(1, "rgba(0,0,0,0)");
        sx.fillStyle = sg; sx.fillRect(0, 0, 256, 256);
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(95, 95), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

        const camera = new THREE.PerspectiveCamera(30, mount.clientWidth / mount.clientHeight, 1, 5000);
        camera.position.set(95, 120, 185);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 90;
        controls.maxDistance = 420;
        controls.target.set(0, 13, 0);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        controls.autoRotate = !reduced;
        controls.autoRotateSpeed = 0.8;
        renderer.domElement.addEventListener("pointerdown", () => { controls.autoRotate = false; }, { once: true });

        /* Targets the animation eases toward: visibility and lift per part. */
        const target = { lid: 0, fear: 0, lidOn: true, fearOn: true };
        const LIFT = { lid: 26, fear: -22 };
        apiRef.current = {
          set: ({ lid, fear, explode }) => {
            target.lidOn = lid; target.fearOn = fear;
            target.lid = explode ? LIFT.lid : 0; target.fear = explode ? LIFT.fear : 0;
          },
        };
        apiRef.current.set({ ...initial, explode: false });

        let raf = 0;
        const tick = () => {
          const k = reduced ? 1 : 0.12;
          for (const name of ["lidSteel", "lidSilicone"]) {
            holder[name].visible = target.lidOn;
            holder[name].position.y += (target.lid - holder[name].position.y) * k;
          }
          holder.fear.visible = target.fearOn;
          holder.fear.position.y += (target.fear - holder.fear.position.y) * k;
          shadow.position.y = Math.min(0, holder.fear.visible ? holder.fear.position.y - 4.4 : 0) - 0.05;
          controls.update();
          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };
        tick();

        const onResize = () => {
          renderer.setSize(mount.clientWidth, mount.clientHeight);
          camera.aspect = mount.clientWidth / mount.clientHeight;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);
        setState("ready");

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          controls.dispose();
          scene.traverse((o) => {
            const m = o as InstanceType<typeof THREE.Mesh>;
            if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => mt.dispose()); }
          });
          pmrem.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (err) {
        console.error("[3d] viewer failed", err);
        if (!disposed) setState("error");
      }
    })();
    return () => { disposed = true; cleanup(); };
    // initial is read once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { apiRef.current?.set({ ...parts, explode }); }, [parts, explode]);

  const chip = () => "h-11 px-5 rounded-full text-[14px] font-medium transition-colors cursor-pointer border";
  const chipStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: "var(--accent)", color: "#111114", borderColor: "var(--accent)" }
      : { background: "#ffffff", color: "#111", borderColor: "#d6d6d6" };

  return (
    <div role="dialog" aria-modal="true" aria-label={L.title} className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#f5f5f5" }}>
      <div className="flex items-center justify-between px-5 md:px-8 h-16 shrink-0">
        <div>
          <div dir="ltr" className="text-[13px] tracking-[0.2em] uppercase" style={{ color: "#111" }}>LID &amp; FEAR 9E418</div>
          {classicNote && <div className="text-[13px] mt-0.5" style={{ color: "#707072" }}>{L.note}</div>}
        </div>
        <button onClick={onClose} aria-label={L.close} className="w-11 h-11 rounded-full grid place-items-center cursor-pointer" style={{ background: "#ffffff", border: "1px solid #e0e0e0" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div ref={mountRef} className="relative flex-1 min-h-0 touch-none">
        {state !== "ready" && (
          <div className="absolute inset-0 grid place-items-center text-[14px]" style={{ color: "#707072" }}>
            {state === "loading" ? L.loading : L.error}
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 md:px-8 pt-3 pb-6 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2" dir="ltr">
          <button type="button" aria-pressed={parts.lid} onClick={() => setParts((p) => ({ ...p, lid: !p.lid }))} className={chip()} style={chipStyle(parts.lid)}>LID 9E418</button>
          <button type="button" aria-pressed={parts.fear} onClick={() => setParts((p) => ({ ...p, fear: !p.fear }))} className={chip()} style={chipStyle(parts.fear)}>FEAR 9E418</button>
          <button type="button" aria-pressed={explode} onClick={() => setExplode((e) => !e)} className={chip()} style={chipStyle(explode)}>{L.explode}</button>
        </div>
        <div className="text-[12px]" style={{ color: "#8a8a8e" }}>{L.hint}</div>
      </div>
    </div>
  );
}
