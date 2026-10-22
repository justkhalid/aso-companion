/* The line icons of the club kit (24 grid, stroke 0.9; the accent paths are filled). The first 34 come from the generator, the rest were added for the Social kit. */
import { ICON_DATA } from '../icons-data'
export const KIT_ICONS: Record<string, { label: string; stroke: string; accent: string; sw?: number; group?: string }> = {
 "i-movie": {
  "label": "Movie night",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9.2\" fill=\"none\"/><circle cx=\"12\" cy=\"6.4\" r=\"1.9\" fill=\"none\"/><circle cx=\"17.6\" cy=\"12\" r=\"1.9\" fill=\"none\"/><circle cx=\"12\" cy=\"17.6\" r=\"1.9\" fill=\"none\"/><circle cx=\"6.4\" cy=\"12\" r=\"1.9\" fill=\"none\"/>",
  "accent": "<circle cx=\"12\" cy=\"12\" r=\"1.7\" fill=\"#000\" stroke=\"none\"/>"
 },
 "i-speaking": {
  "label": "Public speaking",
  "stroke": "<circle cx=\"10\" cy=\"5\" r=\"2.4\" fill=\"none\"/><path d=\"M5.6 11.6a4.4 4.4 0 0 1 8.8 0M4.4 11.6h15.2l-1.2 3H5.6zM17.6 8.6v3\" fill=\"none\"/><rect x=\"16.4\" y=\"2.6\" width=\"2.4\" height=\"4.4\" rx=\"1.2\" fill=\"none\"/><path d=\"M15.4 5.4a2.2 2.2 0 0 0 4.4 0\" fill=\"none\"/><circle cx=\"4.9\" cy=\"18.6\" r=\"1.5\" fill=\"none\"/><circle cx=\"12\" cy=\"18.6\" r=\"1.5\" fill=\"none\"/><circle cx=\"19.1\" cy=\"18.6\" r=\"1.5\" fill=\"none\"/><path d=\"M2.2 23.2a2.7 2.7 0 0 1 5.4 0M9.3 23.2a2.7 2.7 0 0 1 5.4 0M16.4 23.2a2.7 2.7 0 0 1 5.4 0\" fill=\"none\"/>",
  "accent": "<path d=\"M5.4 2.8a3.8 3.8 0 0 0 0 4.4M3 1.4a6.6 6.6 0 0 0 0 7.2M21.2 3.2a3 3 0 0 1 0 3.6\" fill=\"none\"/>"
 },
 "i-philo": {
  "label": "Philosophy",
  "stroke": "<path d=\"M8.4 5.6h7.2M9.6 5.6l.6 1.6h3.6l.6-1.6M10.2 7.2L10.6 20.2M13.8 7.2L13.4 20.2M8.6 20.2h6.8M7.6 21.8h8.8\" fill=\"none\"/><path d=\"M10.1 11.06A10 3 0 0 0 2 14A10 3 0 0 0 12 17A10 3 0 0 0 22 14A10 3 0 0 0 13.9 11.06\" fill=\"none\"/>",
  "accent": "<path d=\"M12 0.4L12.7 1.7 14 2.4 12.7 3.1 12 4.4 11.3 3.1 10 2.4 11.3 1.7z\" fill=\"#000\" stroke=\"none\"/><circle cx=\"20.66\" cy=\"12.5\" r=\"0.95\" fill=\"#000\" stroke=\"none\"/><circle cx=\"3.34\" cy=\"15.5\" r=\"0.95\" fill=\"#000\" stroke=\"none\"/>"
 },
 "i-sports": {
  "label": "Sports ball",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\"/><path d=\"M3 12h18M12 3v18\" fill=\"none\"/>",
  "accent": "<path d=\"M5.5 5.6c3.1 3.2 3.1 9.6 0 12.8M18.5 5.6c-3.1 3.2-3.1 9.6 0 12.8\" fill=\"none\"/>"
 },
 "i-africa": {
  "label": "Africa map",
  "stroke": "<path d=\"M7 4.8L10.6 3.6 14.4 4 16.2 6 17.6 8.4 20.6 9.6 18.6 12.4 17 14.4 16 17.6 14.2 20.8 12.4 20.6 11.2 17.4 10.6 14.2 8.4 13.4 5.6 13.2 3.6 10.6 4.8 7.4z\" fill=\"none\"/>",
  "accent": "<circle cx=\"8.4\" cy=\"6.6\" r=\"1.4\" fill=\"#000\" stroke=\"none\"/>"
 },
 "i-psy": {
  "label": "Psychology",
  "stroke": "<path d=\"M6.5 15.6C4 15 2.8 12.6 3.6 10.4 3.2 8 5 6 7.2 6.2 8.2 4.2 11 3.6 12.8 4.8 14.6 3.6 17.4 4.4 18 6.6 20.2 7.2 21.2 9.6 20.2 11.6 21 13.6 19.6 15.8 17.4 15.8 16.600 17.400 14.800 17.800 13.400 17 12.200 18.400 9.600 18.400 8.600 16.800 7.800 16.600 7 16.200 6.500 15.600z\" fill=\"none\"/><path d=\"M11.200 18.200l.4 3h2.400\" fill=\"none\"/>",
  "accent": "<path d=\"M8 10c1.200-.2 2.200.4 2.600 1.400M12.800 7.400c-.2 1.200.4 2.200 1.400 2.800M10.600 13.800c1.400-.4 2.600.2 3.200 1.200M15.600 11.800c.8-.6 1.800-.6 2.600 0\" fill=\"none\"/>"
 },
 "i-reading": {
  "label": "Reading",
  "stroke": "<path d=\"M12 6.6C10 5 6.4 4.7 3 5.6v12.6c3.4-.9 7-.6 9 .9 2-1.5 5.6-1.8 9-.9V5.6C17.6 4.7 14 5 12 6.6z\" fill=\"none\"/><path d=\"M12 6.6v12.5\" fill=\"none\"/>",
  "accent": "<path d=\"M5.8 9.2h3.4M5.8 12.2h3.4M14.8 9.2h3.4M14.8 12.2h3.4\" fill=\"none\"/>"
 },
 "chess": {
  "label": "Chess",
  "stroke": "<circle cx=\"12\" cy=\"6.4\" r=\"2.6\" fill=\"none\"/><path d=\"M9.8 11.4h4.4M10.4 11.4c-.3 3-1.5 4.8-3.4 6.4h10c-1.9-1.6-3.1-3.4-3.4-6.4M5.8 20.6h12.4M7 17.8l-.8 2.8M17 17.8l.8 2.8\" fill=\"none\"/>",
  "accent": "<circle cx=\"12\" cy=\"6.4\" r=\"1.1\" fill=\"#000\" stroke=\"none\"/>"
 },
 "coding": {
  "label": "Coding",
  "stroke": "<rect x=\"2.8\" y=\"4.4\" width=\"18.4\" height=\"15.2\" rx=\"3\" fill=\"none\"/><path d=\"M2.8 8.8h18.4\" fill=\"none\"/>",
  "accent": "<path d=\"M9.8 11.8L7.8 14l2 2.2M14.2 11.8l2 2.2-2 2.2M12.8 11.4l-1.6 5.6\" fill=\"none\"/>"
 },
 "robotics": {
  "label": "Robotics",
  "stroke": "<rect x=\"4.8\" y=\"8\" width=\"14.4\" height=\"11.6\" rx=\"3.2\" fill=\"none\"/><path d=\"M12 8V4.6M3 12.6v3.2M21 12.6v3.2\" fill=\"none\"/><circle cx=\"12\" cy=\"3.8\" r=\"1\" fill=\"none\"/>",
  "accent": "<circle cx=\"9\" cy=\"13\" r=\"1.4\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15\" cy=\"13\" r=\"1.4\" fill=\"#000\" stroke=\"none\"/><path d=\"M9.4 16.6h5.2\" fill=\"none\"/>"
 },
 "music": {
  "label": "Music",
  "stroke": "<path d=\"M9.4 18V6.4L19.4 4.2V16\" fill=\"none\"/><ellipse cx=\"7\" cy=\"18\" rx=\"2.6\" ry=\"2.2\" fill=\"none\"/><ellipse cx=\"17\" cy=\"16\" rx=\"2.6\" ry=\"2.2\" fill=\"none\"/>",
  "accent": "<path d=\"M9.4 9.8l10-2.2\" fill=\"none\"/>"
 },
 "art": {
  "label": "Art",
  "stroke": "<path d=\"M12 3.2C7 3.2 3 7 3 11.8c0 4.4 3.4 8 7.6 8 1.4 0 2-.9 1.6-2-.4-1.2.2-2.4 1.6-2.4H17c2.4 0 4-1.6 4-3.8C21 6.4 17 3.2 12 3.2z\" fill=\"none\"/>",
  "accent": "<circle cx=\"7.6\" cy=\"11\" r=\"1.3\" fill=\"#000\" stroke=\"none\"/><circle cx=\"10.6\" cy=\"7.4\" r=\"1.3\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15.2\" cy=\"7.8\" r=\"1.3\" fill=\"#000\" stroke=\"none\"/>"
 },
 "photography": {
  "label": "Photography",
  "stroke": "<rect x=\"2.8\" y=\"7.4\" width=\"18.4\" height=\"12.4\" rx=\"2.8\" fill=\"none\"/><path d=\"M8.4 7.4l1.2-2.6h4.8l1.2 2.6\" fill=\"none\"/>",
  "accent": "<circle cx=\"12\" cy=\"13.6\" r=\"3.6\" fill=\"none\"/><circle cx=\"12\" cy=\"13.6\" r=\"1.1\" fill=\"#000\" stroke=\"none\"/>"
 },
 "debate": {
  "label": "Debate",
  "stroke": "<path d=\"M4 4.8h9.4a1.8 1.8 0 0 1 1.8 1.8v4.8a1.8 1.8 0 0 1-1.8 1.8H8.4L5.4 15.8v-2.6H4a1.8 1.8 0 0 1-1.8-1.8V6.6A1.8 1.8 0 0 1 4 4.8z\" fill=\"none\"/><path d=\"M17.4 10.4h2.4a1.8 1.8 0 0 1 1.8 1.8v4.8a1.8 1.8 0 0 1-1.8 1.8h-.8v2.6l-3-2.6h-5a1.8 1.8 0 0 1-1.8-1.8v-.8\" fill=\"none\"/>",
  "accent": "<circle cx=\"6\" cy=\"9\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"8.8\" cy=\"9\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"11.6\" cy=\"9\" r=\".9\" fill=\"#000\" stroke=\"none\"/>"
 },
 "science": {
  "label": "Science",
  "stroke": "<path d=\"M9.6 3.6h4.8M10.4 3.6v5.8L5 18.6a1.8 1.8 0 0 0 1.6 2.8h10.8a1.8 1.8 0 0 0 1.6-2.8L13.6 9.4V3.6\" fill=\"none\"/>",
  "accent": "<path d=\"M7.6 15.4h8.8\" fill=\"none\"/><circle cx=\"11\" cy=\"18.2\" r=\"1\" fill=\"#000\" stroke=\"none\"/><circle cx=\"14.4\" cy=\"17.6\" r=\".8\" fill=\"#000\" stroke=\"none\"/>"
 },
 "math": {
  "label": "Math",
  "stroke": "<rect x=\"4.6\" y=\"2.8\" width=\"14.8\" height=\"18.4\" rx=\"3\" fill=\"none\"/><rect x=\"7.8\" y=\"5.8\" width=\"8.4\" height=\"3.6\" rx=\"1\" fill=\"none\"/>",
  "accent": "<circle cx=\"9\" cy=\"13.2\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"12\" cy=\"13.2\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15\" cy=\"13.2\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"9\" cy=\"16.8\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"12\" cy=\"16.8\" r=\".9\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15\" cy=\"16.8\" r=\".9\" fill=\"#000\" stroke=\"none\"/>"
 },
 "history": {
  "label": "History",
  "stroke": "<path d=\"M6.4 3.6h11.2M6.4 20.4h11.2M7.4 3.6c0 4.4 3 5.8 4.6 8.4-1.6 2.6-4.6 4-4.6 8.4M16.6 3.6c0 4.4-3 5.8-4.6 8.4 1.6 2.6 4.6 4 4.6 8.4\" fill=\"none\"/>",
  "accent": "<path d=\"M9.4 18c1.6-1.6 3.6-1.6 5.2 0\" fill=\"none\"/><circle cx=\"12\" cy=\"7.2\" r=\"1\" fill=\"#000\" stroke=\"none\"/>"
 },
 "geography": {
  "label": "Geography",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\"/><ellipse cx=\"12\" cy=\"12\" rx=\"4\" ry=\"9\" fill=\"none\"/><path d=\"M3.4 8.6h17.2M3.4 15.4h17.2\" fill=\"none\"/>",
  "accent": "<circle cx=\"15.6\" cy=\"9.8\" r=\"1.7\" fill=\"#000\" stroke=\"none\"/>"
 },
 "language": {
  "label": "Languages",
  "stroke": "<path d=\"M4.2 4.6h15.6a1.8 1.8 0 0 1 1.8 1.8v9.2a1.8 1.8 0 0 1-1.8 1.8H12l-4.6 3.8v-3.8H4.2a1.8 1.8 0 0 1-1.8-1.8V6.4a1.8 1.8 0 0 1 1.8-1.8z\" fill=\"none\"/>",
  "accent": "<path d=\"M9 14.2l3-7.2 3 7.2M10.1 11.8h3.8\" fill=\"none\"/>"
 },
 "environment": {
  "label": "Environment",
  "stroke": "<path d=\"M4.6 19.4c-.6-8.4 4-14.4 15.2-14.4.6 9.6-4.6 14.6-12 13.8\" fill=\"none\"/>",
  "accent": "<path d=\"M4.6 19.4c3-4.6 6.6-7.8 11.4-10\" fill=\"none\"/>"
 },
 "health": {
  "label": "Health",
  "stroke": "<path d=\"M12 20.4C5.2 15.8 3 12.4 3 9a4.8 4.8 0 0 1 9-2.4A4.8 4.8 0 0 1 21 9c0 3.4-2.2 6.8-9 11.4z\" fill=\"none\"/>",
  "accent": "<path d=\"M6.4 11.6h3l1.6-3 2.4 5.4 1.6-2.4h2.6\" fill=\"none\"/>"
 },
 "football": {
  "label": "Football",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\"/>",
  "accent": "<path d=\"M12 8.2l3 2.2-1.2 3.4h-3.6L9 10.4z\" fill=\"#000\" stroke=\"none\"/><path d=\"M12 8.2V3.2M15 10.4l4.8-1.6M13.8 13.8l2.8 4.2M10.2 13.8L7.4 18M9 10.4L4.2 8.8\" fill=\"none\"/>"
 },
 "volunteering": {
  "label": "Volunteering",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9.2\" fill=\"none\"/>",
  "accent": "<path d=\"M12 16.8c-3.6-2.4-4.8-4.2-4.8-6a2.6 2.6 0 0 1 4.8-1.4 2.6 2.6 0 0 1 4.8 1.4c0 1.8-1.200 3.600-4.800 6z\" fill=\"#000\" stroke=\"none\"/>"
 },
 "entrepreneurship": {
  "label": "Business",
  "stroke": "<path d=\"M9.4 17.4h5.2M10.2 20.4h3.6M12 3.2a6 6 0 0 0-3.7 10.7c.6.5 1 1.3 1 2.1v1.4h5.4V16c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3.2z\" fill=\"none\"/>",
  "accent": "<path d=\"M10.2 9.8l1.8 2.4 1.8-2.4\" fill=\"none\"/>"
 },
 "gaming": {
  "label": "Gaming",
  "stroke": "<path d=\"M7 7.6h10a4.8 4.8 0 0 1 4.6 3.8l.8 4.4a2.5 2.5 0 0 1-4.4 1.9L16 15.8H8l-2 1.9a2.5 2.5 0 0 1-4.400-1.900l.8-4.400A4.800 4.800 0 0 1 7 7.600z\" fill=\"none\"/>",
  "accent": "<path d=\"M7.6 10.4V14M5.8 12.2h3.6\" fill=\"none\"/><circle cx=\"15.8\" cy=\"11.6\" r=\".95\" fill=\"#000\" stroke=\"none\"/><circle cx=\"18\" cy=\"13.6\" r=\".95\" fill=\"#000\" stroke=\"none\"/>"
 },
 "cooking": {
  "label": "Cooking",
  "stroke": "<path d=\"M7.2 14.4a3.8 3.8 0 0 1-.6-7.4 4.6 4.6 0 0 1 8.8-1 3.8 3.8 0 0 1 2 7.2V19.6H7.2z\" fill=\"none\"/>",
  "accent": "<path d=\"M7.2 16.6h9.6\" fill=\"none\"/>"
 },
 "cybersecurity": {
  "label": "Cybersecurity",
  "stroke": "<path d=\"M12 3L4.4 6v5.6c0 4.6 3 8 7.6 9.4 4.6-1.4 7.6-4.8 7.6-9.4V6z\" fill=\"none\"/>",
  "accent": "<rect x=\"9.2\" y=\"10.8\" width=\"5.6\" height=\"4.6\" rx=\"1\" fill=\"none\"/><path d=\"M10.2 10.8V9.4a1.8 1.8 0 0 1 3.6 0v1.4\" fill=\"none\"/>"
 },
 "ai": {
  "label": "AI",
  "stroke": "<rect x=\"6.4\" y=\"6.4\" width=\"11.2\" height=\"11.2\" rx=\"2.4\" fill=\"none\"/><path d=\"M9.6 3.4v3M14.4 3.4v3M9.6 17.6v3M14.4 17.6v3M3.4 9.6h3M3.4 14.4h3M17.6 9.6h3M17.6 14.4h3\" fill=\"none\"/>",
  "accent": "<circle cx=\"12\" cy=\"12\" r=\"1.8\" fill=\"#000\" stroke=\"none\"/>"
 },
 "kids": {
  "label": "Kids",
  "stroke": "<rect x=\"3.4\" y=\"12.6\" width=\"7.8\" height=\"7.8\" rx=\"1.4\" fill=\"none\"/><rect x=\"12.8\" y=\"12.6\" width=\"7.8\" height=\"7.8\" rx=\"1.4\" fill=\"none\"/><rect x=\"8.2\" y=\"4.4\" width=\"7.8\" height=\"7.8\" rx=\"1.4\" fill=\"none\"/>",
  "accent": "<circle cx=\"12.1\" cy=\"8.3\" r=\"1.3\" fill=\"#000\" stroke=\"none\"/>"
 },
 "travel": {
  "label": "Travel",
  "stroke": "<path d=\"M21 3.4L3 10.6l6.4 2.8 2.8 6.4z\" fill=\"none\"/>",
  "accent": "<path d=\"M9.4 13.4L21 3.4\" fill=\"none\"/>"
 },
 "theatre": {
  "label": "Theatre",
  "stroke": "<path d=\"M3.4 4.6h9.6v7.2a4.8 4.8 0 0 1-9.6 0z\" fill=\"none\"/><path d=\"M11 9.2h9.6v7.2a4.8 4.8 0 0 1-9.6 0z\" fill=\"none\"/>",
  "accent": "<path d=\"M5.6 10.6a2.600 2.600 0 0 0 5.200 0M13.2 15.4a2.600 2.600 0 0 1 5.200 0\" fill=\"none\"/><circle cx=\"6.200\" cy=\"7.800\" r=\".8\" fill=\"#000\" stroke=\"none\"/><circle cx=\"10.200\" cy=\"7.800\" r=\".8\" fill=\"#000\" stroke=\"none\"/>"
 },
 "writing": {
  "label": "Writing",
  "stroke": "<path d=\"M4 20.4l1.2-4.6L16.600 4.200a2.200 2.200 0 0 1 3.200 3.200L8.400 18.800z\" fill=\"none\"/>",
  "accent": "<path d=\"M13.600 7.200l3.200 3.200M4 21h8\" fill=\"none\"/>"
 },
 "fitness": {
  "label": "Fitness",
  "stroke": "<path d=\"M6.4 7v10M17.6 7v10M3.4 9.6v4.8M20.6 9.6v4.8\" fill=\"none\"/>",
  "accent": "<path d=\"M6.4 12h11.2\" fill=\"none\"/>"
 },
 "astronomy": {
  "label": "Astronomy",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"5.2\" fill=\"none\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"3.2\" transform=\"rotate(-24 12 12)\" fill=\"none\"/>",
  "accent": "<circle cx=\"19.600\" cy=\"5\" r=\"1.100\" fill=\"#000\" stroke=\"none\"/><circle cx=\"4.600\" cy=\"18.600\" r=\".8\" fill=\"#000\" stroke=\"none\"/>"
 },
 "trophy": {
  "label": "Trophy",
  "stroke": "<path d=\"M7.4 3.8h9.2v5.6a4.6 4.6 0 0 1-9.2 0z\" fill=\"none\"/><path d=\"M7.4 5.8H4.6a3 3 0 0 0 3.2 4.4M16.6 5.8h2.8a3 3 0 0 1-3.2 4.4\" fill=\"none\"/><path d=\"M12 14v3.6M8.6 20.4h6.8M9.6 17.6h4.8v2.8H9.6z\" fill=\"none\"/>",
  "accent": "<path d=\"M12 6.2l.8 1.7 1.8.2-1.3 1.2.4 1.8-1.7-.9-1.7.9.4-1.8-1.3-1.2 1.8-.2z\" fill=\"#000\" stroke=\"none\"/>"
 },
 "microphone": {
  "label": "Microphone",
  "stroke": "<rect x=\"8.8\" y=\"2.8\" width=\"6.4\" height=\"11.4\" rx=\"3.2\" fill=\"none\"/><path d=\"M5.2 11.2a6.8 6.8 0 0 0 13.6 0M12 18v3.2M8.4 21.2h7.2\" fill=\"none\"/>",
  "accent": "<path d=\"M8.8 7.4h6.4M8.8 10.2h6.4\" fill=\"none\"/>"
 },
 "ideas": {
  "label": "Ideas",
  "stroke": "<path d=\"M9 17.4c-2-1.4-3.4-3.6-3.4-6.2a6.4 6.4 0 0 1 12.8 0c0 2.6-1.4 4.8-3.4 6.2z\" fill=\"none\"/><path d=\"M9.4 20.2h5.2M10.4 22.2h3.2\" fill=\"none\"/>",
  "accent": "<path d=\"M9.8 11.4l2.2 2.4 2.2-2.4M12 13.8v3.4\" fill=\"none\"/>"
 },
 "rocket": {
  "label": "Rocket",
  "stroke": "<path d=\"M12 2.6c3 2.2 4.6 5.6 4.6 9.2l-2 3.2H9.4l-2-3.2c0-3.6 1.6-7 4.6-9.2z\" fill=\"none\"/><path d=\"M7.6 11.4L4.8 15l2.8.6M16.4 11.4l2.8 3.6-2.8.6\" fill=\"none\"/><circle cx=\"12\" cy=\"9.2\" r=\"1.7\" fill=\"none\"/>",
  "accent": "<path d=\"M10.4 18c.2 1.6.8 2.8 1.6 3.6.8-.8 1.4-2 1.6-3.6\" fill=\"none\"/>"
 },
 "hiking": {
  "label": "Hiking",
  "stroke": "<path d=\"M2.4 19.6l6.4-11 3.6 5.8 2.4-3.4 6.8 8.6z\" fill=\"none\"/>",
  "accent": "<circle cx=\"17.4\" cy=\"5.6\" r=\"1.9\" fill=\"#000\" stroke=\"none\"/><path d=\"M6.4 12.4l2.4-3.8 1.8 2.8\" fill=\"none\"/>"
 },
 "nature": {
  "label": "Trees",
  "stroke": "<path d=\"M12 3a5.2 5.2 0 0 0-4.6 7.6A4.4 4.4 0 0 0 9 18.2h6a4.4 4.4 0 0 0 1.6-7.6A5.2 5.2 0 0 0 12 3z\" fill=\"none\"/><path d=\"M9.4 21h5.2\" fill=\"none\"/>",
  "accent": "<path d=\"M12 18.2V13M12 14.6l2.2-2.2M12 12.6l-2-1.8\" fill=\"none\"/>"
 },
 "energy": {
  "label": "Energy",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"3.6\" fill=\"none\"/>",
  "accent": "<path d=\"M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8\" fill=\"none\"/>"
 },
 "community": {
  "label": "Community",
  "stroke": "<circle cx=\"12\" cy=\"7.4\" r=\"2.6\" fill=\"none\"/><path d=\"M7.2 19.6v-1.4a4.8 4.8 0 0 1 9.6 0v1.4z\" fill=\"none\"/><circle cx=\"5\" cy=\"10\" r=\"2\" fill=\"none\"/><circle cx=\"19\" cy=\"10\" r=\"2\" fill=\"none\"/>",
  "accent": "<path d=\"M2.2 18.4v-.8a3.2 3.2 0 0 1 3.2-3.2M21.8 18.4v-.8a3.2 3.2 0 0 0-3.2-3.2\" fill=\"none\"/>"
 },
 "graduation": {
  "label": "Graduation",
  "stroke": "<path d=\"M12 4.2L2.6 9 12 13.8 21.4 9z\" fill=\"none\"/><path d=\"M6.4 11.6v4.4c0 1.4 2.6 3 5.6 3s5.6-1.6 5.6-3v-4.4\" fill=\"none\"/>",
  "accent": "<path d=\"M21.4 9v6\" fill=\"none\"/><circle cx=\"21.4\" cy=\"16.2\" r=\".9\" fill=\"#000\" stroke=\"none\"/>"
 },
 "news": {
  "label": "News",
  "stroke": "<path d=\"M4 4.4h12.4v15.2H6.4A2.4 2.4 0 0 1 4 17.2z\" fill=\"none\"/><path d=\"M16.4 8.4H20v8.8a2.4 2.4 0 0 1-2.4 2.4H6.4\" fill=\"none\"/>",
  "accent": "<path d=\"M7 8.4h6M7 11.6h6M7 14.8h4\" fill=\"none\"/>"
 },
 "clapper": {
  "label": "Film",
  "stroke": "<path d=\"M4.8 9.8V20h14.4V9.8\" fill=\"none\"/><path d=\"M3.6 6.4h16.8v3.4H3.6z\" fill=\"none\"/>",
  "accent": "<path d=\"M8.6 6.4L7 9.8M13.4 6.4l-1.6 3.4M18.2 6.4l-1.6 3.4M3.6 3.4l16.8 0\" fill=\"none\"/>"
 },
 "piano": {
  "label": "Piano",
  "stroke": "<rect x=\"3\" y=\"5.4\" width=\"18\" height=\"13.2\" rx=\"2.4\" fill=\"none\"/><path d=\"M7.5 13v5.6M12 13v5.6M16.5 13v5.6\" fill=\"none\"/>",
  "accent": "<path d=\"M6.4 5.4h2.2V13H6.4zM10.9 5.4h2.2V13h-2.2zM15.4 5.4h2.2V13h-2.2z\" fill=\"#000\" stroke=\"none\"/>"
 },
 "dice": {
  "label": "Board games",
  "stroke": "<rect x=\"3.6\" y=\"3.6\" width=\"16.8\" height=\"16.8\" rx=\"4.4\" fill=\"none\"/>",
  "accent": "<circle cx=\"8.4\" cy=\"8.4\" r=\"1.2\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15.6\" cy=\"8.4\" r=\"1.2\" fill=\"#000\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"#000\" stroke=\"none\"/><circle cx=\"8.4\" cy=\"15.6\" r=\"1.2\" fill=\"#000\" stroke=\"none\"/><circle cx=\"15.6\" cy=\"15.6\" r=\"1.2\" fill=\"#000\" stroke=\"none\"/>"
 },
 "calendar": {
  "label": "Workshop",
  "stroke": "<rect x=\"3.6\" y=\"5.4\" width=\"16.8\" height=\"15\" rx=\"2.8\" fill=\"none\"/><path d=\"M3.6 10h16.8M8 3.2v4M16 3.2v4\" fill=\"none\"/>",
  "accent": "<path d=\"M8.6 15l2.4 2.4 4.6-4.6\" fill=\"none\"/>"
 },
 "coffee": {
  "label": "Cafe",
  "stroke": "<path d=\"M4.8 9.6h11.2v5.4a4.4 4.4 0 0 1-4.4 4.4H9.2a4.4 4.4 0 0 1-4.4-4.4z\" fill=\"none\"/><path d=\"M16 11h1.4a2.6 2.6 0 0 1 0 5.2H16\" fill=\"none\"/>",
  "accent": "<path d=\"M8.2 3.6c-.9 1.1.9 1.7 0 3M12.2 3.6c-.9 1.1.9 1.7 0 3\" fill=\"none\"/>"
 },
 "cycling": {
  "label": "Cycling",
  "stroke": "<circle cx=\"6\" cy=\"16.4\" r=\"3.6\" fill=\"none\"/><circle cx=\"18\" cy=\"16.4\" r=\"3.6\" fill=\"none\"/><path d=\"M6 16.4l3.6-7.2h5.8l2.6 7.2M6 16.4h6M12 16.4L9.6 9.2M12 16.4l3.4-7.2\" fill=\"none\"/>",
  "accent": "<path d=\"M8.2 7.4h2.8M14.2 7h2.8\" fill=\"none\"/>"
 },
 "swimming": {
  "label": "Swimming",
  "stroke": "<path d=\"M2.4 17.2c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0M2.4 21c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0\" fill=\"none\"/>",
  "accent": "<circle cx=\"15.6\" cy=\"6.8\" r=\"1.9\" fill=\"#000\" stroke=\"none\"/><path d=\"M5.6 13.2l5-3.6 3.2 2.8M10.6 9.6l3.2-.8\" fill=\"none\"/>"
 },
 "yoga": {
  "label": "Yoga",
  "stroke": "<circle cx=\"12\" cy=\"5.2\" r=\"2.1\" fill=\"none\"/><path d=\"M12 8.6c-2.2 0-3.6 1.8-3.6 4.2v1.4h7.2v-1.4c0-2.4-1.4-4.2-3.6-4.2z\" fill=\"none\"/>",
  "accent": "<path d=\"M8.4 12L5 15.2M15.6 12L19 15.2M4.4 19c2.6-2.2 5.2-2.6 7.6-.8 2.4-1.8 5-1.4 7.6.8\" fill=\"none\"/>"
 },
 "basketball": {
  "label": "Basketball",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"none\"/>",
  "accent": "<path d=\"M3 12h18M12 3v18M5.4 5.6c3.6 2.8 3.6 10 0 12.8M18.6 5.6c-3.6 2.8-3.6 10 0 12.8\" fill=\"none\"/>"
 },
 "pingpong": {
  "label": "Ping-pong",
  "stroke": "<circle cx=\"10\" cy=\"10\" r=\"6.4\" fill=\"none\"/><path d=\"M14.6 14.6l5.2 5.2\" fill=\"none\"/>",
  "accent": "<circle cx=\"18.6\" cy=\"5.4\" r=\"1.8\" fill=\"#000\" stroke=\"none\"/>"
 },
 "talent": {
  "label": "Talent show",
  "stroke": "<path d=\"M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z\" fill=\"none\"/>",
  "accent": "<path d=\"M12 8.4l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z\" fill=\"#000\" stroke=\"none\"/>"
 },
 "conversation": {
  "label": "Conversation",
  "stroke": "<path d=\"M3.4 5h11.4v7.4H9l-3.4 3v-3H3.4z\" fill=\"none\"/><path d=\"M9.4 14.6v2.2h5.2l3 3v-3h3v-7h-4.6\" fill=\"none\"/>",
  "accent": "<path d=\"M6.2 8.2h6\" fill=\"none\"/>"
 },
 "library": {
  "label": "Library",
  "stroke": "<path d=\"M3.8 4.8h4.6v14.8H3.8zM8.4 4.8H13v14.8H8.4z\" fill=\"none\"/><path d=\"M13.8 6.6l4.4-1.4 3 14-4.4 1.4z\" fill=\"none\"/>",
  "accent": "<path d=\"M3.8 9h4.6M3.8 15.6h4.6\" fill=\"none\"/>"
 },
 "video": {
  "label": "Video",
  "stroke": "<rect x=\"2.8\" y=\"6.4\" width=\"12.8\" height=\"11.2\" rx=\"2.6\" fill=\"none\"/><path d=\"M15.6 10.4l5.6-3v9.2l-5.6-3\" fill=\"none\"/>",
  "accent": "<circle cx=\"6.4\" cy=\"10\" r=\"0.9\" fill=\"#000\" stroke=\"none\"/>"
 },
 "quiz": {
  "label": "Quiz",
  "stroke": "<circle cx=\"12\" cy=\"12\" r=\"9.2\" fill=\"none\"/>",
  "accent": "<path d=\"M9.4 9.6a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.3 1-1.3 2.1M12 17h.01\" fill=\"none\"/>"
 },
 "dance": {
  "label": "Dance",
  "stroke": "<circle cx=\"13\" cy=\"4.6\" r=\"2\" fill=\"none\"/><path d=\"M13 7.6c-.4 3-1.6 5-3.6 6.2l1.8 6.4M13 7.6c2 1 3.8 1 5.4.2M9.4 13.8c1.6.5 3 .6 4.6.1l2 5.6\" fill=\"none\"/>",
  "accent": "<path d=\"M9.4 9.6L5.6 7M4.2 4.4h.01M6.2 3.2h.01\" fill=\"none\"/>"
 }
}

/* every icon of the club and event picker is also a kit icon (key "app-<name>"), so the icon chosen for a chip can be used in the story too */
for (const k of Object.keys(KIT_ICONS)) KIT_ICONS[k].group = 'Signature'
for (const [name, label, group, inner] of ICON_DATA) {
  KIT_ICONS['app-' + name] = { label, group, sw: 1.15, accent: '', stroke: inner.replace(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g, '<$1 fill="none"') }
}
