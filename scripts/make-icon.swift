// Draws Writeshaper's icons.
//   swift scripts/make-icon.swift assets/icon.png         -> 1024x1024 app icon
//   swift scripts/make-icon.swift assets/tray.png tray    -> menu bar / tray glyphs
// App icon: a tangerine-to-violet glass tile with three lines of text; the middle line is being
// reshaped (a bright highlight), with a sparkle beside it.
import AppKit
let args = CommandLine.arguments
let out = args[1]
let tray = args.count > 2 && args[2] == "tray"

func star(_ ctx: CGContext, _ c: CGPoint, _ r: CGFloat) {
  let s = CGMutablePath()
  s.move(to: CGPoint(x: c.x, y: c.y + r))
  s.addQuadCurve(to: CGPoint(x: c.x + r, y: c.y), control: CGPoint(x: c.x + r * 0.16, y: c.y + r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x, y: c.y - r), control: CGPoint(x: c.x + r * 0.16, y: c.y - r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x - r, y: c.y), control: CGPoint(x: c.x - r * 0.16, y: c.y - r * 0.16))
  s.addQuadCurve(to: CGPoint(x: c.x, y: c.y + r), control: CGPoint(x: c.x - r * 0.16, y: c.y + r * 0.16))
  ctx.addPath(s); ctx.fillPath()
}
func bar(_ ctx: CGContext, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
  ctx.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: w, height: h), cornerWidth: h / 2, cornerHeight: h / 2, transform: nil)); ctx.fillPath()
}
func save(_ img: NSImage, _ path: String) {
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}

if tray {
  // Template glyphs (black + alpha): 18pt and 36px @2x for the Mac menu bar, 32px for Windows (white).
  for (name, px, color) in [("trayTemplate.png", 18, NSColor.black), ("trayTemplate@2x.png", 36, NSColor.black), ("tray.png", 32, NSColor.white)] {
    let s = CGFloat(px)
    let img = NSImage(size: NSSize(width: s, height: s))
    img.lockFocus()
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.setFillColor(color.cgColor)
    let k = s / 18
    bar(ctx, 1.5 * k, 12 * k, 10 * k, 2.4 * k)
    bar(ctx, 1.5 * k, 7.8 * k, 7 * k, 2.4 * k)
    bar(ctx, 1.5 * k, 3.6 * k, 12 * k, 2.4 * k)
    star(ctx, CGPoint(x: 14 * k, y: 11 * k), 3.6 * k)
    img.unlockFocus()
    save(img, (out as NSString).deletingLastPathComponent + "/" + name)
  }
  exit(0)
}

let size: CGFloat = 1024
let img = NSImage(size: NSSize(width: size, height: size))
img.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext
let cs = CGColorSpaceCreateDeviceRGB()
let inset: CGFloat = 100
let rect = CGRect(x: inset, y: inset, width: size - inset * 2, height: size - inset * 2)
let tile = CGPath(roundedRect: rect, cornerWidth: 190, cornerHeight: 190, transform: nil)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -14), blur: 40, color: NSColor(red: 0.3, green: 0.05, blue: 0.25, alpha: 0.4).cgColor)
ctx.addPath(tile); ctx.setFillColor(NSColor.black.cgColor); ctx.fillPath()
ctx.restoreGState()
ctx.saveGState()
ctx.addPath(tile); ctx.clip()
let g = CGGradient(colorsSpace: cs, colors: [
  NSColor(red: 1.0, green: 0.62, blue: 0.30, alpha: 1).cgColor,
  NSColor(red: 0.98, green: 0.27, blue: 0.50, alpha: 1).cgColor,
  NSColor(red: 0.50, green: 0.33, blue: 0.97, alpha: 1).cgColor] as CFArray, locations: [0, 0.52, 1])!
ctx.drawLinearGradient(g, start: CGPoint(x: inset, y: size - inset), end: CGPoint(x: size - inset, y: inset), options: [])
// Soft top light, like glass.
let glow = CGGradient(colorsSpace: cs, colors: [NSColor(white: 1, alpha: 0.34).cgColor, NSColor(white: 1, alpha: 0).cgColor] as CFArray, locations: [0, 1])!
ctx.drawRadialGradient(glow, startCenter: CGPoint(x: size * 0.36, y: size * 0.84), startRadius: 0, endCenter: CGPoint(x: size * 0.36, y: size * 0.84), endRadius: 520, options: [])
ctx.restoreGState()
// Bright 1px-style rim.
ctx.saveGState()
ctx.addPath(CGPath(roundedRect: rect.insetBy(dx: 3, dy: 3), cornerWidth: 187, cornerHeight: 187, transform: nil))
ctx.setStrokeColor(NSColor(white: 1, alpha: 0.32).cgColor); ctx.setLineWidth(6); ctx.strokePath()
ctx.restoreGState()

// Three lines of text.
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -8), blur: 24, color: NSColor(red: 0.35, green: 0.05, blue: 0.3, alpha: 0.35).cgColor)
ctx.setFillColor(NSColor(white: 1, alpha: 0.95).cgColor)
bar(ctx, 236, 618, 420, 78)
ctx.setFillColor(NSColor(white: 1, alpha: 0.55).cgColor)
bar(ctx, 236, 328, 500, 78)
// The middle line: plain start, then the bright "reshaped" part.
ctx.setFillColor(NSColor(white: 1, alpha: 0.95).cgColor)
bar(ctx, 236, 473, 170, 78)
ctx.setFillColor(NSColor.white.cgColor)
bar(ctx, 434, 461, 290, 102)
ctx.restoreGState()
// Sparkle.
ctx.setFillColor(NSColor.white.cgColor)
star(ctx, CGPoint(x: 760, y: 700), 96)
star(ctx, CGPoint(x: 846, y: 610), 36)
img.unlockFocus()
save(img, out)
