using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

/* The one-file installer. It carries the app, the build info, the Google keys, the worker (Install-ASO.ps1), the fonts and the
   pictures as resources. It draws its own window (sharp on every screen, smooth progress, the ASO fonts and colours) and runs the
   worker in the background; the worker reports each step as a line of text and this window shows it. Built by installer\build-installer.ps1.
   Written for the C# 5 compiler that ships with Windows. */

enum Stage { Ready, Running, Done, Failed }

sealed class Surface : Control
{
    /* the window is 560 x 640 units; everything is centred on the middle line (x = 280) and spaced by hand below */
    const int W = 560, H = 640, CX = 280;
    static readonly Color Navy = Color.FromArgb(14, 26, 74), Blue = Color.FromArgb(26, 86, 255), Crim = Color.FromArgb(214, 34, 43);
    static readonly Color Ink = Color.FromArgb(16, 24, 48), Mute = Color.FromArgb(96, 106, 134), Line = Color.FromArgb(222, 228, 240), Pearl = Color.FromArgb(247, 245, 241);

    public Stage Stage = Stage.Ready;
    public string[] Steps = new string[] { "Install Node.js", "Unpack the app", "Install the app parts", "Build the app", "Save the settings", "Put the icon on the Desktop" };
    public int[] StepState = new int[6];   // 0 waiting, 1 working, 2 done, 3 failed
    public float Target;
    public string Say = "";
    public string Message = "";
    public event Action ButtonClicked;
    public event Action CloseClicked;

    float shown, pulse, scale = 1f, lift;   // lift: 0 resting, 1 hovered (eases)
    Rectangle btnRect = new Rectangle(172, 556, 216, 58), closeRect = new Rectangle(518, 14, 28, 28);
    bool btnHover, btnDown, closeHover;
    Font fTitle, fHead, fBody, fBodyB, fSmall, fTiny, fBtn;
    Image logo, glass;
    Bitmap still;   // the part that never changes, drawn once
    PrivateFontCollection pfc = new PrivateFontCollection();
    System.Collections.Generic.List<IntPtr> pinned = new System.Collections.Generic.List<IntPtr>();
    Timer timer = new Timer();

    public Surface()
    {
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) scale = g.DpiX / 96f;
        Size = new Size((int)Math.Round(W * scale), (int)Math.Round(H * scale));
        Assembly a = Assembly.GetExecutingAssembly();
        string bodoni = Family(a, "bodoni.ttf"), man = Family(a, "manrope-m.ttf"); Family(a, "manrope-b.ttf");
        fTitle = Make(bodoni, 31f, FontStyle.Italic);
        fHead = Make(man, 13f, FontStyle.Bold);
        fBody = Make(man, 10f, FontStyle.Regular); fBodyB = Make(man, 10f, FontStyle.Bold);
        fSmall = Make(man, 9f, FontStyle.Regular); fTiny = Make(man, 8f, FontStyle.Bold); fBtn = Make(man, 12.5f, FontStyle.Bold);
        logo = Img(a, "logo.png"); glass = Img(a, "bg.jpg");
        timer.Interval = 33;
        timer.Tick += delegate
        {
            shown += (Target - shown) * 0.12f;
            if (Math.Abs(Target - shown) < 0.05f) shown = Target;
            pulse += 0.11f;
            float to = btnHover ? 1f : 0f; lift += (to - lift) * 0.25f; if (Math.Abs(to - lift) < 0.02f) lift = to;
            Invalidate();
        };
        timer.Start();
    }

    public void StopTimer() { timer.Stop(); }

    string Family(Assembly a, string res)
    {
        using (Stream s = a.GetManifestResourceStream(res))
        {
            if (s == null) return null;
            byte[] b = ReadAll(s);
            IntPtr p = Marshal.AllocCoTaskMem(b.Length); Marshal.Copy(b, 0, p, b.Length); pinned.Add(p);
            pfc.AddMemoryFont(p, b.Length);
            return pfc.Families[pfc.Families.Length - 1].Name;
        }
    }
    Font Make(string family, float pt, FontStyle st)
    {
        // a font of the families that were loaded (each file holds one weight), else a plain system font
        foreach (FontFamily f in pfc.Families)
            if (f.Name == family)
            {
                FontStyle use = f.IsStyleAvailable(st) ? st : f.IsStyleAvailable(FontStyle.Regular) ? FontStyle.Regular : f.IsStyleAvailable(FontStyle.Italic) ? FontStyle.Italic : FontStyle.Bold;
                return new Font(f, pt * 96f / 72f, use, GraphicsUnit.Pixel);
            }
        return new Font("Segoe UI", pt * 96f / 72f, st & ~FontStyle.Italic, GraphicsUnit.Pixel);
    }
    static Image Img(Assembly a, string res)
    {
        using (Stream s = a.GetManifestResourceStream(res)) { if (s == null) return null; return Image.FromStream(new MemoryStream(ReadAll(s))); }
    }
    static byte[] ReadAll(Stream s) { MemoryStream m = new MemoryStream(); s.CopyTo(m); return m.ToArray(); }

    static GraphicsPath Round(RectangleF r, float rad)
    {
        GraphicsPath p = new GraphicsPath(); float d = rad * 2;
        p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure(); return p;
    }
    static float TextWidth(Graphics g, string t, Font f, float sp)
    {
        float w = 0; foreach (char c in t) w += g.MeasureString(c.ToString(), f, 600, StringFormat.GenericTypographic).Width + sp; return w - sp;
    }
    static void Spaced(Graphics g, string t, Font f, Brush b, float x, float y, float sp)
    {
        float cx = x - TextWidth(g, t, f, sp) / 2;
        foreach (char c in t) { g.DrawString(c.ToString(), f, b, cx, y, StringFormat.GenericTypographic); cx += g.MeasureString(c.ToString(), f, 600, StringFormat.GenericTypographic).Width + sp; }
    }
    static StringFormat Centered() { return new StringFormat { Alignment = StringAlignment.Center, FormatFlags = StringFormatFlags.NoClip }; }

    string Title() { return Stage == Stage.Ready ? "Install ASO Companion" : Stage == Stage.Running ? "Installing..." : Stage == Stage.Done ? "You are all set" : "Something went wrong"; }
    string Lead()
    {
        if (Stage == Stage.Ready) return "Everything is done for you in about 5 to 10 minutes. At the end you sign in with Google once.";
        if (Stage == Stage.Running) return "Keep this window open. Windows may ask you to allow one step.";
        if (Stage == Stage.Done) return "ASO Companion is opening. Sign in with Google in the window that appears, once. The icon is on your Desktop.";
        return Message.Length > 0 ? Message : "The installation did not finish.";
    }
    string ButtonText() { return Stage == Stage.Ready ? "Install" : Stage == Stage.Done ? "Close" : Stage == Stage.Failed ? "Try again" : ""; }

    /* the picture that does not move: the pearl ground with its glass corners, the crest, the name */
    Bitmap Still()
    {
        Bitmap bm = new Bitmap((int)Math.Round(W * scale), (int)Math.Round(H * scale));
        using (Graphics g = Graphics.FromImage(bm))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias; g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.ScaleTransform(scale, scale);
            g.Clear(Pearl);
            if (glass != null)
            {
                float sc = Math.Max(W / (float)glass.Width, H / (float)glass.Height), gw = glass.Width * sc, gh = glass.Height * sc;
                g.DrawImage(glass, new RectangleF((W - gw) / 2, (H - gh) / 2, gw, gh));
            }
            if (logo != null) { float lh = 96, lw = lh * logo.Width / logo.Height; g.DrawImage(logo, CX - lw / 2, 40, lw, lh); }
            // the name, as large as fits the window
            string name = "ASO Companion"; float size = 31f * 96f / 72f; Font ft = fTitle;
            while (g.MeasureString(name, ft, 900, StringFormat.GenericTypographic).Width > 440 && size > 18) { size -= 1; ft = new Font(fTitle.FontFamily, size, fTitle.Style, GraphicsUnit.Pixel); }
            using (LinearGradientBrush tb = new LinearGradientBrush(new RectangleF(CX - 140, 0, 280, 10), Navy, Crim, 0f))
                g.DrawString(name, ft, tb, new RectangleF(0, 148, W, 50), Centered());
            using (SolidBrush soft = new SolidBrush(Color.FromArgb(150, Navy))) Spaced(g, "AMERICAN SPACE OUJDA", fTiny, soft, CX, 214, 3.4f);
            using (LinearGradientBrush rb = new LinearGradientBrush(new RectangleF(CX - 40, 0, 80, 3), Navy, Crim, 0f)) g.FillRectangle(rb, CX - 40, 244, 80, 2);
        }
        return bm;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        if (still == null || still.Width != (int)Math.Round(W * scale)) still = Still();
        Graphics g = e.Graphics;
        g.DrawImageUnscaled(still, 0, 0);
        g.SmoothingMode = SmoothingMode.AntiAlias; g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality; g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        g.ScaleTransform(scale, scale);

        using (SolidBrush ink = new SolidBrush(Ink)) g.DrawString(Title(), fHead, ink, new RectangleF(0, 264, W, 24), Centered());
        using (SolidBrush mute = new SolidBrush(Mute)) g.DrawString(Lead(), fBody, mute, new RectangleF(70, 294, W - 140, 44), Centered());

        // the steps: a row of dots on the middle line, the step in progress named under it
        int n = Steps.Length; float pitch = 38f, x0 = CX - (n - 1) * pitch / 2f, dotY = 384f;
        for (int i = 0; i < n; i++)
        {
            int st = Stage == Stage.Ready ? 0 : (i < StepState.Length ? StepState[i] : 0);
            DrawDot(g, x0 + i * pitch, dotY, st);
        }
        int cur = -1;
        if (Stage != Stage.Ready) for (int i = 0; i < n && i < StepState.Length; i++) if (StepState[i] == 1 || StepState[i] == 3) cur = i;
        if (cur < 0 && Stage == Stage.Done) cur = n - 1;
        string cap = Stage == Stage.Ready ? n + " AUTOMATIC STEPS" : cur >= 0 ? "STEP " + (cur + 1) + " OF " + n : "";
        using (SolidBrush cb = new SolidBrush(Stage == Stage.Failed ? Crim : Blue)) if (cap.Length > 0) Spaced(g, cap, fTiny, cb, CX, 424f, 3.2f);
        string nm = Stage == Stage.Ready ? "Nothing to choose, nothing to type" : cur >= 0 ? Steps[cur] : "";
        using (SolidBrush ib = new SolidBrush(Stage == Stage.Failed ? Crim : Ink)) g.DrawString(nm, fHead, ib, new RectangleF(0, 446, W, 26), Centered());

        // the progress bar, and under it one centred line: what is happening and the percentage
        if (Stage != Stage.Ready)
        {
            using (GraphicsPath track = Round(new RectangleF(40, 510, 480, 6), 3)) using (SolidBrush tb = new SolidBrush(Line)) g.FillPath(tb, track);
            float fw = Math.Max(6f, 480f * Math.Min(100f, shown) / 100f);
            using (GraphicsPath fill = Round(new RectangleF(40, 510, fw, 6), 3))
            using (LinearGradientBrush fb = new LinearGradientBrush(new RectangleF(40, 510, Math.Max(fw, 2f), 6), Stage == Stage.Failed ? Crim : Blue, Stage == Stage.Failed ? Crim : Navy, 0f)) g.FillPath(fb, fill);
            string line = ((int)Math.Round(shown)).ToString() + "%" + (Say.Length > 0 ? "   ·   " + Say : "");
            using (SolidBrush mute = new SolidBrush(Mute)) g.DrawString(line, fSmall, mute, new RectangleF(40, 526, 480, 20), new StringFormat { Alignment = StringAlignment.Center, Trimming = StringTrimming.EllipsisCharacter, FormatFlags = StringFormatFlags.NoWrap });
        }

        DrawButton(g);

        // close
        using (Pen p = new Pen(closeHover ? Ink : Mute, 1.6f) { StartCap = LineCap.Round, EndCap = LineCap.Round })
        {
            float cx = closeRect.X + 14, cy = closeRect.Y + 14;
            g.DrawLine(p, cx - 5, cy - 5, cx + 5, cy + 5); g.DrawLine(p, cx - 5, cy + 5, cx + 5, cy - 5);
        }
    }

    /* the button: frosted glass. Colour glows behind it and shows through, a light edge runs round it, a little grain sits on it,
       and a round chip with an arrow stands at its end. It rises and glows more when hovered. */
    Bitmap grainTex;
    Bitmap Grain()
    {
        if (grainTex != null) return grainTex;
        Random rnd = new Random(7);
        Bitmap t = new Bitmap(96, 96, PixelFormat.Format32bppArgb);
        for (int y = 0; y < 96; y++) for (int x = 0; x < 96; x++) { int v = rnd.Next(256); t.SetPixel(x, y, Color.FromArgb(16, v, v, v)); }
        grainTex = t; return t;
    }
    void Orb(Graphics g, float cx, float cy, float rx, float ry, Color c, int alpha)
    {
        using (GraphicsPath o = new GraphicsPath())
        {
            o.AddEllipse(cx - rx, cy - ry, rx * 2, ry * 2);
            using (PathGradientBrush pg = new PathGradientBrush(o)) { pg.CenterColor = Color.FromArgb(alpha, c); pg.SurroundColors = new Color[] { Color.FromArgb(0, c) }; g.FillPath(pg, o); }
        }
    }
    Bitmap frostPic;
    /* the part of the still background that lies under the button, blurred by shrinking and stretching it back */
    Bitmap Frost()
    {
        if (frostPic != null) return frostPic;
        int x = (int)Math.Round(btnRect.X * scale), y = (int)Math.Round(btnRect.Y * scale), w = (int)Math.Round(btnRect.Width * scale), h = (int)Math.Round(btnRect.Height * scale), pad = (int)Math.Round(30 * scale);
        Rectangle src = new Rectangle(Math.Max(0, x - pad), Math.Max(0, y - pad), 0, 0);
        src.Width = Math.Min(still.Width - src.X, w + 2 * pad); src.Height = Math.Min(still.Height - src.Y, h + 2 * pad);
        using (Bitmap small = new Bitmap(Math.Max(2, src.Width / 12), Math.Max(2, src.Height / 12)))
        using (Bitmap big = new Bitmap(src.Width, src.Height))
        {
            using (Graphics sg = Graphics.FromImage(small)) { sg.InterpolationMode = InterpolationMode.HighQualityBicubic; sg.DrawImage(still, new Rectangle(0, 0, small.Width, small.Height), src, GraphicsUnit.Pixel); }
            using (Graphics bg = Graphics.FromImage(big)) { bg.InterpolationMode = InterpolationMode.HighQualityBicubic; bg.DrawImage(small, new Rectangle(0, 0, big.Width, big.Height)); }
            Rectangle crop = new Rectangle(x - src.X, y - src.Y, Math.Min(w, big.Width - (x - src.X)), Math.Min(h, big.Height - (y - src.Y)));
            frostPic = big.Clone(crop, big.PixelFormat);
        }
        return frostPic;
    }

    /* a small icon for the button: an arrow into a tray (install), a tick (done), a circular arrow (try again); drawn in the middle of (cx, cy) */
    void ButtonIcon(Graphics g, float cx, float cy, Color c)
    {
        using (Pen p = new Pen(c, 2.2f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
        {
            if (Stage == Stage.Done) { g.DrawLines(p, new PointF[] { new PointF(cx - 8, cy), new PointF(cx - 2.5f, cy + 6), new PointF(cx + 8, cy - 6) }); }
            else if (Stage == Stage.Failed)
            {
                g.DrawArc(p, cx - 8, cy - 8, 16, 16, 40, 280);
                g.DrawLines(p, new PointF[] { new PointF(cx + 5.5f, cy - 9.5f), new PointF(cx + 7, cy - 4), new PointF(cx + 1.5f, cy - 4.5f) });
            }
            else
            {
                g.DrawLine(p, cx, cy - 8, cx, cy + 4);
                g.DrawLines(p, new PointF[] { new PointF(cx - 5.5f, cy - 1.5f), new PointF(cx, cy + 4), new PointF(cx + 5.5f, cy - 1.5f) });
                g.DrawLines(p, new PointF[] { new PointF(cx - 8, cy + 3), new PointF(cx - 8, cy + 8), new PointF(cx + 8, cy + 8), new PointF(cx + 8, cy + 3) });
            }
        }
    }

    /* the button: a compact pill of frosted glass. The blue behind it shows through in soft diagonal streaks, a light edge runs round it,
       and the icon and the word stand together exactly in the middle. It rises a little when hovered. */
    void DrawButton(Graphics g)
    {
        string bt = ButtonText();
        if (bt.Length == 0) return;
        float dy = -2f * lift + (btnDown ? 1.5f : 0f), glow = 1f + 0.3f * lift;
        RectangleF r = new RectangleF(btnRect.X, btnRect.Y + dy, btnRect.Width, btnRect.Height);
        float rad = r.Height / 2;
        for (int i = 7; i >= 1; i--)
        {
            RectangleF sh = new RectangleF(r.X + 10 - i, r.Y + 9 + i * (1.1f + lift * 0.5f) - 2, r.Width - 20 + 2 * i, r.Height - 6);
            using (GraphicsPath sp = Round(sh, sh.Height / 2)) using (SolidBrush sb = new SolidBrush(Color.FromArgb((int)(8 + lift * 3), 40, 70, 190))) g.FillPath(sb, sp);
        }
        using (GraphicsPath bp = Round(r, rad))
        {
            g.SetClip(bp);
            // real frost: the window's own background under the button, blurred, then veiled with white
            g.DrawImage(Frost(), r);
            using (SolidBrush veil = new SolidBrush(Color.FromArgb((int)(78 + 18 * lift), 255, 255, 255))) g.FillRectangle(veil, r);
            // a little body: lighter at the top, a breath of navy at the bottom
            using (LinearGradientBrush body = new LinearGradientBrush(r, Color.FromArgb(70, 255, 255, 255), Color.FromArgb(26, 14, 26, 74), 90f)) g.FillRectangle(body, r);
            // two soft diagonal streaks of light, like glass catching the light
            for (int k = 0; k < 2; k++)
            {
                float sx = r.X + r.Width * (k == 0 ? 0.20f : 0.62f), sw = r.Width * (k == 0 ? 0.14f : 0.22f);
                PointF[] quad = new PointF[] { new PointF(sx, r.Bottom + 4), new PointF(sx + sw, r.Bottom + 4), new PointF(sx + sw + r.Height * 0.55f, r.Y - 4), new PointF(sx + r.Height * 0.55f, r.Y - 4) };
                using (GraphicsPath sp = new GraphicsPath()) using (SolidBrush sb = new SolidBrush(Color.FromArgb(k == 0 ? 46 : 62, 255, 255, 255))) { sp.AddPolygon(quad); g.FillPath(sb, sp); }
            }
            using (TextureBrush tb = new TextureBrush(Grain())) g.FillRectangle(tb, r);
            g.ResetClip();
            // the edge: bright at the top, a faint navy line at the bottom
            using (LinearGradientBrush eb = new LinearGradientBrush(r, Color.FromArgb(245, 255, 255, 255), Color.FromArgb(70, 14, 26, 74), 90f))
            using (Pen ep = new Pen(eb, 1.5f)) g.DrawPath(ep, bp);
        }
        // the icon and the word, together, exactly in the middle
        float iw = 22f, gap = 10f, tw;
        using (StringFormat sf = StringFormat.GenericTypographic) tw = g.MeasureString(bt, fBtn, 600, sf).Width;
        float total = iw + gap + tw, x0 = r.X + (r.Width - total) / 2, cy = r.Y + r.Height / 2;
        using (SolidBrush ib = new SolidBrush(Ink))
        {
            ButtonIcon(g, x0 + iw / 2, cy, Ink);
            g.DrawString(bt, fBtn, ib, x0 + iw + gap, cy - fBtn.Height / 2f - 0.5f, StringFormat.GenericTypographic);
        }
    }

    void DrawDot(Graphics g, float cx, float cy, int st)
    {
        float r = 10;
        if (st == 2)
        {
            using (SolidBrush b = new SolidBrush(Blue)) g.FillEllipse(b, cx - r, cy - r, r * 2, r * 2);
            using (Pen p = new Pen(Color.White, 1.9f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round }) g.DrawLines(p, new PointF[] { new PointF(cx - 4.5f, cy), new PointF(cx - 1.2f, cy + 3.4f), new PointF(cx + 4.5f, cy - 3.4f) });
        }
        else if (st == 3)
        {
            using (SolidBrush b = new SolidBrush(Crim)) g.FillEllipse(b, cx - r, cy - r, r * 2, r * 2);
            using (Pen p = new Pen(Color.White, 1.9f) { StartCap = LineCap.Round, EndCap = LineCap.Round }) { g.DrawLine(p, cx - 3.8f, cy - 3.8f, cx + 3.8f, cy + 3.8f); g.DrawLine(p, cx - 3.8f, cy + 3.8f, cx + 3.8f, cy - 3.8f); }
        }
        else if (st == 1)
        {
            using (Pen p = new Pen(Color.FromArgb(60, Blue), 2f)) g.DrawEllipse(p, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2);
            using (Pen p = new Pen(Blue, 2.4f) { StartCap = LineCap.Round, EndCap = LineCap.Round }) g.DrawArc(p, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2, pulse * 120f, 100f);
        }
        else
        {
            using (Pen p = new Pen(Color.FromArgb(190, 198, 216), 1.6f)) g.DrawEllipse(p, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2);
        }
    }

    Point Logical(Point p) { return new Point((int)(p.X / scale), (int)(p.Y / scale)); }
    protected override void OnMouseMove(MouseEventArgs e)
    {
        Point p = Logical(e.Location);
        bool h = ButtonText().Length > 0 && btnRect.Contains(p), c = closeRect.Contains(p);
        if (h != btnHover || c != closeHover) { btnHover = h; closeHover = c; Cursor = (h || c) ? Cursors.Hand : Cursors.Default; Invalidate(); }
        base.OnMouseMove(e);
    }
    protected override void OnMouseLeave(EventArgs e) { btnHover = false; btnDown = false; closeHover = false; Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseUp(MouseEventArgs e) { btnDown = false; base.OnMouseUp(e); }
    protected override void OnMouseDown(MouseEventArgs e)
    {
        Point p = Logical(e.Location);
        if (e.Button == MouseButtons.Left)
        {
            if (closeRect.Contains(p)) { if (CloseClicked != null) CloseClicked(); return; }
            if (ButtonText().Length > 0 && btnRect.Contains(p)) { btnDown = true; if (ButtonClicked != null) ButtonClicked(); return; }
            Launcher.DragWindow(FindForm());   // drag the window by its background
        }
        base.OnMouseDown(e);
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing) { timer.Stop(); timer.Dispose(); foreach (IntPtr p in pinned) Marshal.FreeCoTaskMem(p); pinned.Clear(); if (still != null) still.Dispose(); if (frostPic != null) frostPic.Dispose(); }
        base.Dispose(disposing);
    }

    public void Snapshot(string path, bool hover)
    {
        btnHover = hover; lift = hover ? 1f : 0f;
        using (Bitmap bm = new Bitmap(Width, Height)) { DrawToBitmap(bm, new Rectangle(0, 0, Width, Height)); bm.Save(path, ImageFormat.Png); }
    }
    public void Jump() { shown = Target; }
}

static class Launcher
{
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, int msg, int w, int l);
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int val, int size);

    static Form form; static Surface ui; static Process worker; static string dir, installed = "";
    static bool test, finished;

    public static void DragWindow(Form f) { ReleaseCapture(); SendMessage(f.Handle, 0xA1, 2, 0); }

    [STAThread]
    static int Main(string[] args)
    {
        try { SetProcessDPIAware(); } catch { }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        test = Environment.GetEnvironmentVariable("ASO_SETUP_TEST") == "1";
        ui = new Surface();
        form = new Form();
        form.FormBorderStyle = FormBorderStyle.None;
        form.StartPosition = FormStartPosition.CenterScreen;
        form.ClientSize = ui.Size;
        form.ShowInTaskbar = true;
        form.Text = "ASO Companion setup";
        form.BackColor = Color.White;
        ui.Dock = DockStyle.Fill;
        form.Controls.Add(ui);
        form.HandleCreated += delegate { int v = 2; try { DwmSetWindowAttribute(form.Handle, 33, ref v, 4); } catch { } };   // round corners on Windows 11
        try { form.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        string snap = Environment.GetEnvironmentVariable("ASO_SETUP_SNAPSHOT");
        if (!string.IsNullOrEmpty(snap)) { Snapshots(snap); Environment.Exit(0); return 0; }

        ui.ButtonClicked += delegate
        {
            if (ui.Stage == Stage.Ready || ui.Stage == Stage.Failed) Begin();
            else if (ui.Stage == Stage.Done) form.Close();
        };
        ui.CloseClicked += delegate
        {
            if (ui.Stage == Stage.Running && MessageBox.Show(form, "The installation is not finished. Stop it?", "ASO Companion", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            form.Close();
        };
        form.FormClosing += delegate { Stop(); };
        form.Shown += delegate { if (Environment.GetEnvironmentVariable("ASO_SETUP_AUTO") == "1") Begin(); };
        Application.Run(form);
        return 0;
    }

    /* pictures of every screen of the window, to look at them without installing anything */
    static void Snapshots(string folder)
    {
        Directory.CreateDirectory(folder);
        ui.StopTimer();
        form.CreateControl();
        ui.Snapshot(Path.Combine(folder, "1-ready.png"), false);
        ui.Snapshot(Path.Combine(folder, "1b-ready-hover.png"), true);
        ui.Stage = Stage.Running; ui.StepState = new int[] { 2, 2, 1, 0, 0, 0 }; ui.Target = 46; ui.Jump(); ui.Say = "Installing the app parts. This takes a few minutes.";
        ui.Snapshot(Path.Combine(folder, "2-running.png"), false);
        ui.Stage = Stage.Done; ui.StepState = new int[] { 2, 2, 2, 2, 2, 2 }; ui.Target = 100; ui.Jump(); ui.Say = "";
        ui.Snapshot(Path.Combine(folder, "3-done.png"), false);
        ui.Stage = Stage.Failed; ui.StepState = new int[] { 2, 2, 3, 0, 0, 0 }; ui.Target = 46; ui.Jump(); ui.Message = "The app parts could not be installed. Check the internet connection, then try again.";
        ui.Snapshot(Path.Combine(folder, "4-failed.png"), false);
    }

    static void Begin()
    {
        Stop();
        finished = false;
        ui.Stage = Stage.Running; ui.Message = ""; ui.Say = "Getting ready..."; ui.Target = 2; ui.StepState = new int[ui.Steps.Length];
        try
        {
            dir = Path.Combine(Path.GetTempPath(), "aso-setup-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dir);
            Assembly asm = Assembly.GetExecutingAssembly();
            foreach (string name in new string[] { "Install-ASO.ps1", "app.zip", "build-info.json", "google.json" })
                using (Stream s = asm.GetManifestResourceStream(name)) using (FileStream f = File.Create(Path.Combine(dir, name))) s.CopyTo(f);
            ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -File \"" + Path.Combine(dir, "Install-ASO.ps1") + "\"");
            psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WorkingDirectory = dir;
            psi.RedirectStandardOutput = true; psi.StandardOutputEncoding = Encoding.UTF8;
            worker = Process.Start(psi);
            Process w = worker;
            System.Threading.Thread t = new System.Threading.Thread(delegate ()
            {
                string line;
                while ((line = w.StandardOutput.ReadLine()) != null) { string l = line; try { form.BeginInvoke(new Action(delegate { Handle(l); })); } catch { } }
                try { form.BeginInvoke(new Action(delegate { Ended(); })); } catch { }
            });
            t.IsBackground = true; t.Start();
        }
        catch (Exception e) { Fail("The setup could not start: " + e.Message); }
    }

    static void Handle(string line)
    {
        if (!line.StartsWith("##")) return;
        string[] p = line.Substring(2).Split(new char[] { '|' }, 3);
        string k = p[0];
        if (k == "STEPS" && p.Length > 1) { ui.Steps = p[1].Split(';'); ui.StepState = new int[ui.Steps.Length]; }
        else if (k == "STEP" && p.Length > 2)
        {
            int i; if (int.TryParse(p[1], out i) && i >= 0 && i < ui.StepState.Length) ui.StepState[i] = p[2] == "active" ? 1 : p[2] == "done" ? 2 : 3;
        }
        else if (k == "SAY" && p.Length > 1) ui.Say = p[1];
        else if (k == "PROGRESS" && p.Length > 1) { float v; if (float.TryParse(p[1], out v)) ui.Target = v; }
        else if (k == "DONE") { installed = p.Length > 1 ? p[1] : ""; finished = true; ui.Stage = Stage.Done; ui.Target = 100; ui.Say = ""; Opening(); }
        else if (k == "FAIL") Fail(p.Length > 1 ? p[1] : "The installation did not finish.");
    }

    static void Opening()
    {
        if (test) { form.BeginInvoke(new Action(delegate { form.Close(); })); return; }
        try { string vbs = Path.Combine(installed, "ASO Companion.vbs"); if (File.Exists(vbs)) Process.Start(new ProcessStartInfo("wscript.exe", "\"" + vbs + "\"") { UseShellExecute = false, WorkingDirectory = installed }); } catch { }
    }

    static void Fail(string msg)
    {
        finished = true; ui.Stage = Stage.Failed; ui.Message = msg; ui.Say = "Details: the file aso-setup.log in your Temp folder.";
        if (test) form.BeginInvoke(new Action(delegate { form.Close(); }));
    }

    static void Ended()
    {
        if (!finished) Fail("The setup stopped unexpectedly.");
    }

    static void Stop()
    {
        try { if (worker != null && !worker.HasExited) Process.Start(new ProcessStartInfo("taskkill", "/PID " + worker.Id + " /T /F") { CreateNoWindow = true, UseShellExecute = false }); } catch { }
        worker = null;
        try { if (dir != null && Directory.Exists(dir) && ui.Stage != Stage.Running) Directory.Delete(dir, true); } catch { }
    }
}
