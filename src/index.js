const lcjs = require('@lightningchart/lcjs')

const { lightningChart, Themes, AxisScrollStrategies, LUT, regularColorSteps } = lcjs

const chart = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .ParallelCoordinateChart({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    })
    .setTitle('Real-Time Parallel Coordinate Chart')
    .setAxes(['Time', 'A', 'B', 'C', 'D', 'E'])
    .setSpline(true)
    .forEachAxis((axis) => axis.setScrollStrategy(AxisScrollStrategies.fittingStepped))

// Time axis is only used for dynamic coloring.
chart.getAxis('Time').setVisible(false)

const RandomDataGenerator = (start, mul) => {
    let prev = start
    return () => {
        const y = prev + (Math.random() * 2 - 1) * mul
        prev = y
        return y
    }
}
const Y0 = RandomDataGenerator(0, 2)
const Y1 = RandomDataGenerator(1000, 200)
const Y2 = RandomDataGenerator(100, 20)
const Y3 = RandomDataGenerator(10, 2)
const Y4 = RandomDataGenerator(80, 10)
let tLastCleanup = -10000
setInterval(() => {
    const tNow = performance.now()
    const y0 = Y0()
    const y1 = Y1()
    const y2 = Y2()
    const y3 = Y3()
    const y4 = Y4()
    chart.addSeries({ automaticColorIndex: 0 }).setData({
        Time: tNow,
        A: y0,
        B: y1,
        C: y2,
        D: y3,
        E: y4,
    })

    // Manual data cleaning, batched for better performance.
    if (tNow - tLastCleanup >= 5_000) {
        // Remove series that are older than 1 minute
        const series = chart.getSeries().slice()
        series.forEach((s) => {
            const data = s.getData()
            const timestamp = data && data.Time
            if (timestamp && tNow - timestamp >= 60_000) s.dispose()
        })

        // Color series dynamically based on how new the data points are
        chart.setLUT({
            axis: chart.getAxis('Time'),
            lut: new LUT({
                interpolate: true,
                steps: regularColorSteps(tNow - 60_000, tNow, chart.getTheme().examples.intensityColorPalette).map((step, i, steps) => ({
                    ...step,
                    color: step.color.setA(255 * (i / (steps.length - 1))),
                })),
            }),
        })
        tLastCleanup = tNow
    }
}, 50)
