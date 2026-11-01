/** Copyright (C) 2026 Der Akademiker und der Hauptschüler
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*
* Author: Der Akademiker und der Hauptschüler
*/

// Renders a chart description (<name>.chart.json next to a post) to a static SVG.
// No JavaScript ends up on the site: the SVG is written at build time.
//
// Two chart types:
// - "bars":   grouped horizontal bars, one value per series and row
// - "ranges": a range { from, to } or an upper bound { max } per series and row
// A value may set its own "decimals" when the source rounds (e.g. "−31 %").
//
// Every value label the chart shows must also appear in the post text (see
// chartLabels), so chart and tables cannot drift apart unnoticed.

const COLORS = {
    surface: '#1A1A1A',
    grid: '#2A2A2A',
    title: '#FFFFFF',
    text: '#E0E0E0',
    muted: '#9E9E9E',
};

const WIDTH = 720;
const LABEL_X = 186;
const PLOT_LEFT = 200;
const PLOT_RIGHT = 640;
const TOP = 84;
const BAR = 22;
const BAR_GAP = 2;
const ROW_GAP = 26;

const escapeXml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[c]));

// German number format with a real minus sign, e.g. -38.5 -> "−38,5"
export function formatNumber(value, decimals) {
    const text = Math.abs(value).toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return value < 0 ? `−${text}` : text;
}

function valueLabel(chart, value) {
    const unit = chart.unit ? ` ${chart.unit}` : '';
    const d = value.decimals ?? chart.decimals ?? 1;
    if (value.max !== undefined) return `${chart.maxPrefix ?? 'höchstens'} ${formatNumber(value.max, d)}${unit}`;
    if (value.from !== undefined) return `${formatNumber(value.from, d)}–${formatNumber(value.to, d)}${unit}`;
    return `${formatNumber(value.value, d)}${unit}`;
}

// The value labels as they must appear in the post (without the "höchstens" prefix).
export function chartLabels(chart) {
    const unit = chart.unit ? ` ${chart.unit}` : '';
    return chart.rows.flatMap((row) => row.values.map((v) => (v.max !== undefined
        ? `${formatNumber(v.max, v.decimals ?? chart.decimals ?? 1)}${unit}`
        : valueLabel(chart, v))));
}

function validate(chart, name) {
    if (!['bars', 'ranges'].includes(chart.type)) throw new Error(`${name}: type must be "bars" or "ranges"`);
    for (const field of ['title', 'subtitle', 'series', 'rows', 'sources', 'axis']) {
        if (!chart[field]) throw new Error(`${name}: missing field "${field}"`);
    }
    for (const row of chart.rows) {
        if (row.values.length !== chart.series.length) {
            throw new Error(`${name}: row "${row.label}" needs one value per series`);
        }
        if (!row.source) throw new Error(`${name}: row "${row.label}" needs a "source"`);
    }
}

export function renderChart(chart, name) {
    validate(chart, name);
    const [axisMin, axisMax, axisStep] = chart.axis;
    // Negative-only bar charts grow to the right, like the reading direction of the labels.
    const flip = chart.type === 'bars' && axisMax <= 0;
    const span = axisMax - axisMin;
    const x = (v) => {
        const t = flip ? (axisMax - v) / span : (v - axisMin) / span;
        return PLOT_LEFT + t * (PLOT_RIGHT - PLOT_LEFT);
    };

    const rowHeight = chart.series.length * BAR + (chart.series.length - 1) * BAR_GAP;
    const plotBottom = TOP + chart.rows.length * rowHeight + (chart.rows.length - 1) * ROW_GAP + 8;
    const footY = plotBottom + 54;
    const height = footY + (chart.footnote ? 18 : 0) + 18;

    const out = [];
    const desc = chart.rows.map((row) => `${row.label}: ${row.values
        .map((v, i) => `${chart.series[i].label} ${valueLabel(chart, v)}`).join(', ')}`).join('. ');

    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" role="img" aria-labelledby="t d" font-family="Inter, Arial, sans-serif">`);
    out.push(`  <title id="t">${escapeXml(chart.title)}: ${escapeXml(chart.subtitle)}</title>`);
    out.push(`  <desc id="d">${escapeXml(desc)}.</desc>`);
    out.push(`  <rect width="${WIDTH}" height="${height}" rx="8" fill="${COLORS.surface}"/>`);
    out.push(`  <text x="24" y="36" fill="${COLORS.title}" font-size="18" font-weight="700">${escapeXml(chart.title)}</text>`);
    out.push(`  <text x="24" y="58" fill="${COLORS.muted}" font-size="13">${escapeXml(chart.subtitle)}</text>`);

    // Legend, right-aligned
    let legendX = WIDTH - 24;
    for (const s of [...chart.series].reverse()) {
        legendX -= s.label.length * 7.5 + 20;
        out.push(`  <rect x="${legendX}" y="26" width="14" height="14" rx="3" fill="${s.color}"/>`);
        out.push(`  <text x="${legendX + 20}" y="38" fill="${COLORS.text}" font-size="13">${escapeXml(s.label)}</text>`);
        legendX -= 16;
    }

    for (let v = axisMin; v <= axisMax + 1e-9; v += axisStep) {
        const gx = x(v).toFixed(1);
        out.push(`  <line x1="${gx}" y1="${TOP}" x2="${gx}" y2="${plotBottom}" stroke="${COLORS.grid}" stroke-width="1"/>`);
        out.push(`  <text x="${gx}" y="${plotBottom + 20}" fill="${COLORS.muted}" font-size="12" text-anchor="middle">${formatNumber(v, 0)}${chart.unit ? ` ${chart.unit}` : ''}</text>`);
    }

    chart.rows.forEach((row, r) => {
        const rowTop = TOP + 8 + r * (rowHeight + ROW_GAP);
        out.push(`  <text x="${LABEL_X}" y="${rowTop + rowHeight / 2 + 5}" fill="${COLORS.text}" font-size="15" text-anchor="end">${escapeXml(row.label)}</text>`);

        row.values.forEach((v, i) => {
            const s = chart.series[i];
            const y = rowTop + i * (BAR + BAR_GAP);
            const label = valueLabel(chart, v);
            const tip = `<title>${escapeXml(`${row.label}, ${s.label}: ${label}`)}</title>`;
            let end;
            if (v.max !== undefined) {
                // Upper bound only: a marker, because the lower end is open.
                end = x(v.max);
                out.push(`  <path d="M${end.toFixed(1)},${y + 2} l-9,9 l9,9 z" fill="${s.color}">${tip}</path>`);
                out.push(`  <line x1="${(end - 34).toFixed(1)}" y1="${y + 11}" x2="${(end - 9).toFixed(1)}" y2="${y + 11}" stroke="${s.color}" stroke-width="2" stroke-dasharray="3 3"/>`);
            } else {
                const [a, b] = v.from !== undefined ? [x(v.from), x(v.to)] : [x(0), x(v.value)];
                const left = Math.min(a, b);
                const w = Math.max(Math.abs(b - a), 2);
                end = left + w;
                out.push(`  <rect x="${left.toFixed(1)}" y="${y + 3}" width="${w.toFixed(1)}" height="${BAR - 6}" rx="4" fill="${s.color}">${tip}</rect>`);
            }
            out.push(`  <text x="${(end + 12).toFixed(1)}" y="${y + 16}" fill="${COLORS.text}" font-size="14" font-weight="600">${escapeXml(label)}</text>`);
        });
    });

    let fy = footY;
    if (chart.footnote) {
        out.push(`  <text x="24" y="${fy}" fill="${COLORS.muted}" font-size="11">${escapeXml(chart.footnote)}</text>`);
        fy += 18;
    }
    out.push(`  <text x="24" y="${fy}" fill="${COLORS.muted}" font-size="11">Quellen: ${escapeXml(chart.sources)}</text>`);
    out.push('</svg>');
    return `${out.join('\n')}\n`;
}
