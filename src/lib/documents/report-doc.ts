import { bullet, buildDocx, h1, hint, para, table } from './docx'
import { formatDay } from './dates'

/* The activity report as a plain Word document, laid out for writing: the facts already filled in, every section with a short
   note on what belongs there. No design: it is meant to be edited in Word and printed or sent. */

export interface ReportDocFields {
  activity: string
  /* yyyy-mm-dd, or empty */
  date: string
  time: string
  place: string
  leader: string
  participants: string
  preparedBy: string
  role: string
  summary: string
  highlights: string[]
}

export const defaultReportDoc = (): ReportDocFields => ({
  activity: '',
  date: '',
  time: '',
  place: 'American Space Oujda',
  leader: '',
  participants: '',
  preparedBy: '',
  role: '',
  summary: '',
  highlights: ['', '', ''],
})

export const reportDocProblems = (f: ReportDocFields): string[] => (f.activity.trim() ? [] : ['Add the name of the activity'])

const BLANK = '                    ' /* room to write in a table cell */
const v = (s: string) => s.trim() || BLANK

/** the file name, from the activity: letters and numbers only */
export function reportFileName(f: ReportDocFields): string {
  const slug = f.activity.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  return `ASO-activity-report${slug ? '-' + slug : ''}.docx`
}

export async function buildReportDoc(f: ReportDocFields): Promise<Blob> {
  const hl = f.highlights.map((h) => h.trim()).filter(Boolean)
  const body = [
    para('American Space Oujda', { bold: true, color: 'D6222B', size: 20, after: 40 }),
    para('Activity report', { style: 'Title' }),

    h1('1. Activity details'),
    table(
      [
        ['Activity', v(f.activity)],
        ['Date', v(formatDay(f.date))],
        ['Time', v(f.time)],
        ['Place', v(f.place)],
        ['Led by', v(f.leader)],
        ['Prepared by', v([f.preparedBy.trim(), f.role.trim()].filter(Boolean).join(', '))],
      ],
      [2400, 7238],
      false,
      true,
    ),

    h1('2. Purpose and objectives'),
    hint('Why was this activity held, and what did the team want to achieve? Two or three short lines or bullets.'),
    bullet(BLANK),

    h1('3. What happened'),
    hint('Describe the activity in order: the welcome, the programme, the main moments and how it ended.'),
    f.summary.trim() ? para(f.summary.trim()) : para(BLANK),

    h1('4. Participation'),
    table(
      [
        ['', 'Number'],
        ['Participants in total', v(f.participants)],
        ['Girls and women', BLANK],
        ['Boys and men', BLANK],
        ['Volunteers and interns who helped', BLANK],
        ['Partners or guests', BLANK],
      ],
      [6000, 3638],
    ),
    hint('Ages or groups reached (for example children, teenagers, adults, teachers):'),
    para(BLANK),

    h1('5. Results and highlights'),
    hint('What went well? Numbers, feedback, moments worth remembering.'),
    ...(hl.length ? hl.map((h) => bullet(h)) : [bullet(BLANK), bullet(BLANK), bullet(BLANK)]),

    h1('6. Challenges and lessons learned'),
    hint('What was difficult, what would you change next time?'),
    bullet(BLANK),

    h1('7. Feedback received'),
    hint('What did participants, parents, teachers or partners say? A short quote is welcome.'),
    para(BLANK),

    h1('8. Follow-up actions'),
    table(
      [
        ['Action', 'Who', 'By when'],
        [BLANK, BLANK, BLANK],
        [BLANK, BLANK, BLANK],
        [BLANK, BLANK, BLANK],
      ],
      [5200, 2400, 2038],
    ),

    h1('9. Materials and costs'),
    hint('What was used or bought, and anything to restock. Leave empty if there is nothing to report.'),
    para(BLANK),

    h1('10. Photos'),
    hint('Insert two to four photos here: Insert, Pictures. Keep each photo whole.'),
    para(BLANK),

    h1('11. Sign-off'),
    table(
      [
        ['Prepared by', 'Checked by'],
        [`Name: ${f.preparedBy.trim() || BLANK}\nRole: ${f.role.trim() || BLANK}\nDate: ${BLANK}\nSignature:`, `Name: ${BLANK}\nRole: ${BLANK}\nDate: ${BLANK}\nSignature:`],
      ],
      [4819, 4819],
    ),
  ].join('')
  return buildDocx(body, 'American Space Oujda  |  Activity report')
}
