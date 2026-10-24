/* Makes the Mac installer file: the setup script (LF line ends) with the payload (.tar.gz) after its last line, put into a .tar.gz
   in which the file is marked executable. A Mac opens such an archive by double-click and the .command inside runs by double-click;
   a file made on Windows could not carry the executable mark any other way.
   node installer/mac/pack.cjs <setup.sh> <payload.tgz> <out.tar.gz> */
const fs = require('fs')
const zlib = require('zlib')
const [script, payload, out] = process.argv.slice(2)
if (!script || !payload || !out) throw new Error('usage: pack.cjs <setup.sh> <payload.tgz> <out.tar.gz>')

const text = fs.readFileSync(script, 'utf8').replace(/\r\n/g, '\n')
if (!text.endsWith('\n__ASO_PAYLOAD__\n')) throw new Error('the script must end with the marker line __ASO_PAYLOAD__')
const file = Buffer.concat([Buffer.from(text, 'utf8'), fs.readFileSync(payload)])

/* one entry of a tar archive (ustar): 512 byte header, the data, padding to 512 */
function entry(name, data, mode) {
  const h = Buffer.alloc(512)
  const put = (s, off, len) => h.write(s, off, len, 'utf8')
  const oct = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0'
  put(name, 0, 100)
  put(oct(mode, 8), 100, 8)
  put(oct(0, 8), 108, 8)
  put(oct(0, 8), 116, 8)
  put(oct(data.length, 12), 124, 12)
  put(oct(Math.floor(Date.now() / 1000), 12), 136, 12)
  put('        ', 148, 8) /* the checksum is counted with blanks in its place */
  put('0', 156, 1)
  put('ustar\0', 257, 6)
  put('00', 263, 2)
  let sum = 0
  for (const b of h) sum += b
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8)
  const pad = Buffer.alloc((512 - (data.length % 512)) % 512)
  return Buffer.concat([h, data, pad])
}
const tar = Buffer.concat([entry('ASO Companion Setup.command', file, 0o755), Buffer.alloc(1024)])
fs.mkdirSync(require('path').dirname(out), { recursive: true })
fs.writeFileSync(out, zlib.gzipSync(tar, { level: 9 }))
console.log(out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB')
