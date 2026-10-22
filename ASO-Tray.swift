// ASO Companion on a Mac: the icon in the menu bar (Open / Quit). Built once by the app launcher with swiftc.
import Cocoa

let here = FileManager.default.currentDirectoryPath
let url = "http://localhost:3000/admin"

func shell(_ path: String, _ args: [String]) -> String {
    let p = Process(); p.executableURL = URL(fileURLWithPath: path); p.arguments = args
    let out = Pipe(); p.standardOutput = out; p.standardError = Pipe()
    do { try p.run() } catch { return "" }
    p.waitUntilExit()
    return String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
}

func serverUp() -> Bool {
    var ok = false
    let sem = DispatchSemaphore(value: 0)
    var req = URLRequest(url: URL(string: "http://localhost:3000/api/session")!)
    req.timeoutInterval = 3
    URLSession.shared.dataTask(with: req) { _, resp, _ in
        ok = (resp as? HTTPURLResponse)?.statusCode == 200
        sem.signal()
    }.resume()
    _ = sem.wait(timeout: .now() + 4)
    return ok
}

func openApp() {
    if FileManager.default.fileExists(atPath: "/Applications/Google Chrome.app") {
        _ = shell("/usr/bin/open", ["-na", "Google Chrome", "--args", "--app=" + url])
    } else {
        _ = shell("/usr/bin/open", [url])
    }
}

class Delegate: NSObject, NSApplicationDelegate {
    var item: NSStatusItem!
    var misses = 0
    func applicationDidFinishLaunching(_ n: Notification) {
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        if let img = NSImage(contentsOfFile: here + "/public/aso-logo.png") {
            img.size = NSSize(width: 18, height: 18)
            item.button?.image = img
        } else {
            item.button?.title = "ASO"
        }
        item.button?.toolTip = "ASO Companion"
        let menu = NSMenu()
        let open = NSMenuItem(title: "Open ASO Companion", action: #selector(doOpen), keyEquivalent: ""); open.target = self
        let quit = NSMenuItem(title: "Quit ASO Companion", action: #selector(doQuit), keyEquivalent: ""); quit.target = self
        menu.addItem(open); menu.addItem(quit)
        item.menu = menu
        // the icon goes away by itself once the app is gone (a rebuild after an update can take a few minutes)
        Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { _ in
            DispatchQueue.global().async {
                let up = serverUp()
                DispatchQueue.main.async {
                    if up { self.misses = 0 } else { self.misses += 1; if self.misses >= 40 { NSApp.terminate(nil) } }
                }
            }
        }
    }
    @objc func doOpen() { openApp() }
    @objc func doQuit() {
        for pid in shell("/usr/sbin/lsof", ["-ti", "tcp:3000", "-sTCP:LISTEN"]).split(separator: "\n") {
            _ = shell("/bin/kill", [String(pid)])
        }
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = Delegate()
app.delegate = delegate
app.run()
