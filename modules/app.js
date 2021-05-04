let currentStage = 0;

const projection = d3.geoAlbers()
    .scale(1500)
    .translate([600, 500]);

const path = d3.geoPath().projection(projection)

const svg = d3.select("#viz").append("svg")
    .attr("width", "100%")
    .attr("height", "95%");

const controls = d3.select("#controls-container").append("div");
const infoTitle = d3.select("#info-title");
const infoParagraph = d3.select("#info-p-1");
const infoParagraphGraph = d3.select("#info-p-2");

let nextbtn = document.getElementById("nextbtn");
let backbtn = document.getElementById("backbtn");
const loading = document.getElementById("loading-spinner");

const group = svg.append("g");

function initalize() {

    createMapFlightRoutes();
    nextbtn.addEventListener("click", nextStage);
    backbtn.addEventListener("click", lastStage);

}

async function createMapFlightRoutes() {

    disableBtns();

    const airports = await d3.csv("../data/flights/processed_airports.csv");
    const flights = await d3.csv("../data/flights/processed_weekly_flights.csv");
    const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");

    loading.remove();

    us.objects.lower48 = {
        type: "GeometryCollection",
        geometries: us.objects.states.geometries
    };

    infoTitle.transition().duration(300).text("Introduction")
    infoParagraph.transition().duration(300).text("COVID-19 has caused unprecedented damage to the global tourism industry, \"which made up 10 percent of global GDP in 2019 and was worth almost $9 trillion, making the sector nearly three times larger than agriculture\" (McKinsey, 0820).");
    infoParagraphGraph.transition().duration(300).text("In the following graphics, we take a look at how the pandemic has impacted domestic air travel between January, 2019 and March, 2021. In the map to the left, we see commercial flight routes between major aiports within the continental United States, consolidated weekly. The thickness of each route is determined by the number of flights between the origin airport and destination airport for that week. We can see the density of flights throughout the United States falls sharply as the pandemic begins to take hold at roughly 15 weeks into 2020.")

    let week = d3.min(flights, d => parseInt(d.week));
    let year = d3.min(flights, d => parseInt(d.year));

    let maxYear = d3.max(flights, d => parseInt(d.year));
    let maxWeek = 52;

    svg.append("path")
        .datum(topojson.merge(us, us.objects.lower48.geometries))
        .transition()
        .attr("stroke-opacity", 0)
        .attr("fill-opacity", 0)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("fill", "#ddd")
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.lower48, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

    svg.append("g")
        .attr("fill", "red")
        .attr("stroke", "black");

    svg.append("g")
        .selectAll("circles")
        .data(airports)
        .enter()
        .append("circle")
        .attr("cx", d => projection([parseFloat(d.lon), parseFloat(d.lat)])[0])
        .attr("cy", d => projection([parseFloat(d.lon), parseFloat(d.lat)])[1])
        .attr("r", 3)
        .transition()
        .attr("stroke-opacity", 0)
        .attr("fill-opacity", 0)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    const yearLabel = svg.append("text")
        .attr("font-size", "20px")
        .attr("font-style", "normal")
        .attr("style", "stroke: grey")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .48)
        .attr("y", screenHeight * .10)
        .attr("dy", "0.32em")
        .text("year:")

    const yearValue = svg.append("text")
        .attr("font-size", "40px")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .55)
        .attr("y", screenHeight * .10)
        .attr("dy", "0.32em")

    const weekLabel = svg.append("text")
        .attr("font-size", "20px")
        .attr("font-style", "normal")
        .attr("style", "stroke: grey")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .48)
        .attr("y", screenHeight * .15)
        .attr("dy", "0.32em")
        .text("week:")

    const weekValue = svg.append("text")
        .attr("font-size", "40px")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .55)
        .attr("y", screenHeight * .15)
        .attr("dy", "0.32em")

    while (true) {

        yearValue.text(year)
        weekValue.text(week);

        const t = svg.transition()
            .duration(500);

        svg.selectAll(".routes")
            .data(createRoutePaths(weekFilter(flights, week, year)), d => (d.start + d.end + d.start))
            .join(
                enter => enter.append("path")
                    .attr("fill", "none")
                    .attr("stroke", "#72A3D8")
                    .attr("stroke-linecap", 'round')
                    .attr("class", "routes")
                    .attr("d", path)
                    .attr("id", function (d) {
                        return (d.start + ':' + d.end);
                    })
                    .call(enter => enter.transition(t)
                        .attr("stroke-width", function (d) {
                            return d.weight * 0.08
                        })
                        .attr("stroke-opacity", function (d) {
                            return d.weight * 0.005
                        })),
                update => update
                    .call(update => update.transition(t)
                        .attr("stroke-width", function (d) {
                            return d.weight * 0.08
                        })
                        .attr("stroke-opacity", function (d) {
                            return d.weight * 0.005
                        })),
                exit => exit
                    .call(exit => exit.transition(t)
                        .attr("stroke-width", function (d) {
                            return 0
                        }).attr("stroke-opacity", function (d) {
                            return 0
                        }))
                    .remove()
            );

        if ((year == maxYear && week == 12)) {
            break;
        } else if (week == maxWeek) {
            week = 1;
            year++;
        } else {
            week++;
        }

        await sleep(100);
    }

    enableBtns();
}

async function createMapSpikeGraph() {

    disableBtns();

    let data = await d3.csv("../data/flights/processed_airports_monthly_incoming.csv", d3.autoType);
    const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");

    us.objects.lower48 = {
        type: "GeometryCollection",
        geometries: us.objects.states.geometries
    };

    infoTitle.transition().duration(300).text("Incoming Flights")
    infoParagraph.transition().duration(300).text("The map to the left shows the number of incoming flights to major airports within the continental United States.");
    infoParagraphGraph.transition().duration(300).text("By May of 2020, the number of incoming flights between major domestic airports decreased dramatically. For example, in May, 2019 JFK saw a total of 4,858 flights; however, one year later, as the pandemic devestated New York, the airport saw a total of only 549 flights, or just 11% of the previous year.")

    let month = d3.min(data, d => parseInt(d.month));
    let year = d3.min(data, d => parseInt(d.year));

    let maxYear = d3.max(data, d => parseInt(d.year));

    svg.append("path")
        .datum(topojson.merge(us, us.objects.lower48.geometries))
        .transition()
        .attr("stroke-opacity", 0)
        .attr("fill-opacity", 0)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("fill", "#ddd")
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.lower48, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

    const yearLabel = svg.append("text")
        .attr("font-size", "20px")
        .attr("font-style", "normal")
        .attr("style", "stroke: grey")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .48)
        .attr("y", screenHeight * .10)
        .attr("dy", "0.32em")
        .text("year:")

    const yearValue = svg.append("text")
        .attr("font-size", "40px")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .55)
        .attr("y", screenHeight * .10)
        .attr("dy", "0.32em")

    const monthLabel = svg.append("text")
        .attr("font-size", "20px")
        .attr("font-style", "normal")
        .attr("style", "stroke: grey")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .48)
        .attr("y", screenHeight * .15)
        .attr("dy", "0.32em")
        .text("month:")

    const monthValue = svg.append("text")
        .attr("font-size", "40px")
        .attr("text-anchor", "end")
        .attr("x", screenWidth * .55)
        .attr("y", screenHeight * .15)
        .attr("dy", "0.32em")

    let length = d3.scaleLinear([0, d3.max(data, d => d.count)], [0, 200]);
    let spike = (length, width = 7) => `M${-width / 2},0L0,${-length}L${width / 2},0`;

    const legend = svg.append("g")
        .attr("fill", "#777")
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("g")
        .data(length.ticks(6).slice(1).reverse())
        .join("g")
        .attr("transform", (d, i) => `translate(${200 - (i + 1) * 18},${screenHeight-200})`);

    legend.append("path")
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.3)
        .attr("stroke", "steelblue")
        .attr("d", d => spike(length(d)));

    legend.append("text")
        .attr("dy", "1.3em")
        .text(length.tickFormat(4, "s"));


    while (true) {

        yearValue.text(year)
        monthValue.text(month);

        const t = svg.transition()
            .duration(500);

        let airports = monthFilter(data, month, year);

        svg.selectAll(".spikes")
            .data(airports)
            .join(enter => enter.append("path")
                .attr("fill", "steelblue")
                .attr("fill-opacity", 0.3)
                .attr("stroke", "steelblue")
                .attr("class", "spikes")
                .call(enter => enter.attr("transform", d => `translate(${projection([(d.lon), (d.lat)])[0]}, ${projection([(d.lon), (d.lat)])[1]})`)
                    .attr("d", d => spike(length(d.count)))),
                update => update
                    .call(update => update.transition(t)
                        .attr("d", d => spike(length(d.count)))),
                exit => exit.call(exit => exit.transition(t).remove())
            )

        if ((year == 2020 && month == 5)) {
            break;
        } else if (month == 12) {
            month = 1;
            year++;
        } else {
            month++;
        }

        await sleep(500);
    }

    enableBtns();
}

async function createMonthlyFlightsLineGraph() {
    disableBtns();

    let data = await d3.csv("../data/flights/processed_monthly_flights_counts.csv", d3.autoType)

    infoTitle.transition().duration(300).text("View from the sky...")
    infoParagraph.transition().duration(300).text("Over the two year period (2019-2021) accounted for in our analysis, the total number of domestic flights peaked in Decemeber, 2019 at a total of 236,507 flights. However, as the virus spread rapidly and nation-wide travel bans took effect, total flight numbers took a nosedive in March and April of 2020, before bottoming out in May of the same year at 69,372 total flights.")
    infoParagraphGraph.transition().duration(300).text("Hover over the graph to see the total flight counts for each month between January, 2019 and March, 2021.");

    let margin = ({ top: 200, right: 0, bottom: screenHeight / 4, left: 200 })
    let height = screenHeight;
    let width = screenWidth / 2;

    let tooltip = null;

    let x = d3.scaleUtc()
        .domain(d3.extent(data, d => new Date(d.year, d.month - 1)))
        .range([margin.left, width - margin.right])

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.count)]).nice()
        .rangeRound([height - margin.bottom, margin.top])

    let xAxis = (g, scale = x) => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(scale).ticks(width / 80).tickSizeOuter(0))

    let yAxis = (g, y, format) => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(height / 80, format))
        .call(g => g.selectAll(".tick line").clone()
            .attr("stroke-opacity", 0.2)
            .attr("x2", width - margin.left - margin.right))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick:not(:first-of-type) line")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-dasharray", "2,2"))
        .call(g => g.selectAll(".tick text")
            .attr("x", 4)
            .attr("dy", -4))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 10)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("Total Flight Count"))

    const zx = x.copy();

    let line = d3.line()
        .x(d => zx(new Date(d.year, d.month - 1)))
        .y(d => y(d.count))

    const gx = svg.append("g")
        .call(xAxis, zx);

    svg.append("g")
        .style("opacity", 1)
        .call(yAxis, y);

    const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)

    path.transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attrTween("stroke-dasharray", function (d) {
            const length = this.getTotalLength();
            return d3.interpolate(`0,${length}`, `${length},${length}`);
        })

    svg.append("g")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .selectAll("rect")
        .data(d3.pairs(data))
        .join("rect")
        .attr("x", ([a, b]) => x(new Date(a.year, a.month - 1)))
        .attr("height", height)
        .attr("width", ([a, b]) => x(new Date(b.year, b.month - 1)) - x(new Date(a.year, a.month - 1)))
        .on("mouseover", (event, [a, b]) => {
            tooltip = svg.append("g")
                .attr("pointer-events", "none")
                .attr("font-family", "sands-serif")
                .attr("font-size", 14)
                .attr("text-anchor", "middle")
                .attr("transform", `translate(${x(new Date(b.year, b.month - 1))},${y(b.count)})`)
            tooltip.append("rect")
                .attr("class", "tooltip")
                .attr("x", "-27")
                .attr("width", "54")
                .attr("y", "-30")
                .attr("height", "20")
                .attr("fill", "white")
            tooltip.append("text")
                .attr("class", "tooltip-date")
                .attr("y", "-24")
                .text(b.month + "/" + b.year)
                .attr("font-weight", "bold")
            tooltip.append("text")
                .attr("class", "tooltip-date")
                .attr("y", "-10")
                .text(formatNumber(b.count))
            tooltip.append("circle")
                .attr("r", "2.5")
        })
        .on("mouseout", () => tooltip.attr("display", "none"));

    enableBtns();
}

async function createChangeChart() {

    disableBtns();

    let data = await d3.csv("../data/flights/processed_monthly_flights_counts.csv", d3.autoType)

    infoTitle.transition().duration(300).text("Drastic fall...");
    infoParagraph.transition().duration(300).text("In this graphic, we see the percentage-change in monthly flight totals, using January, 2019 as our baseline. Between March and May of 2019, the airline industry witnessed a decrease of over 40% from our basline.");
    infoParagraphGraph.transition().duration(300).text("The line is colored red where the monthly flight total was below that of January, 2019 and colored blue otherwise. The scale is logarithmic in order to highlight the drastic decrease in flights at the height of the pandemic.");

    let base = +(data[0].count)
    let margin = ({ top: 200, right: 0, bottom: screenHeight / 4, left: 200 })
    let height = screenHeight;
    let width = screenWidth / 2;

    let tooltip = null;

    let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(height / 80, format))
        .call(g => g.selectAll(".tick line").clone()
            .attr("stroke-opacity", 0.2)
            .attr("x2", width - margin.left - margin.right))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("% Change since January 2019"))
        .call(d3.axisLeft(y)
            .tickValues(d3.ticks(...y.domain(), 10))
            .tickFormat((x) => {
                const f = d3.format("+.0%");
                return x === 1 ? "0%" : f(x - 1);
            }))


    let xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))
        .call(g => g.select(".domain").remove())

    let y = d3.scaleLog()
        .domain([d3.min(data, d => +d.count / base * 0.9), d3.max(data, d => +d.count / base / 0.9)])
        .rangeRound([height - margin.bottom, margin.top])

    let x = d3.scaleUtc()
        .domain(d3.extent(data, d => new Date(d.year, d.month - 1)))
        .range([margin.left, width - margin.right])

    let line = d3.line()
        .x(d => x(new Date(d.year, d.month - 1)))
        .y(d => y(+d.count / base))

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    svg.append("linearGradient")
        .attr("id", "line-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", height)
        .selectAll("stop")
        .data([
            { offset: .434, color: "steelblue" },
            { offset: y(base * 0.9) / height, color: "red" }
        ])
        .join("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)
        .transition()
        .duration(5000)
        .ease(d3.easeLinear)
        .attrTween("stroke-dasharray", function (d) {
            const length = this.getTotalLength();
            return d3.interpolate(`0,${length}`, `${length},${length}`);
        })

    svg.append("g")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .selectAll("rect")
        .data(d3.pairs(data))
        .join("rect")
        .attr("x", ([a, b]) => x(new Date(a.year, a.month - 1)))
        .attr("height", height)
        .attr("width", ([a, b]) => x(new Date(b.year, b.month - 1)) - x(new Date(a.year, a.month - 1)))
        .on("mouseover", (event, [a, b]) => {
            tooltip = svg.append("g")
                .attr("pointer-events", "none")
                .attr("font-family", "sands-serif")
                .attr("font-size", 10)
                .attr("text-anchor", "middle")
                .attr("transform", `translate(${x(new Date(b.year, b.month - 1))},${y(b.count)})`)
            tooltip.append("rect")
                .attr("class", "tooltip")
                .attr("x", "-27")
                .attr("width", "54")
                .attr("y", "-30")
                .attr("height", "20")
                .attr("fill", "white")
            tooltip.append("text")
                .attr("class", "tooltip-date")
                .attr("y", "-22")
                .text(b.month + "/" + b.year)
                .attr("font-weight", "bold")
            tooltip.append("text")
                .attr("class", "tooltip-date")
                .attr("y", "-12")
                .text(formatNumber(b.count))
            tooltip.append("circle")
                .attr("r", "2.5")
        })
        .on("mouseout", () => tooltip.attr("display", "none"));

    enableBtns();

}

async function createAirlineGraph() {

    disableBtns();

    let data = createMonthlyAirlineSeries(await d3.csv("../data/flights/processed_monthly_flights_airline.csv", d3.autoType))

    infoTitle.text("Major airlines took a hit...");
    infoParagraph.text("None of the major domestic airlines were spared from the impacts of the pandemic. For example, in May, 2020 Southwest Airlines, the largest domestic carrier by flight totals, operated at roughly 57% its capacity from the year before. Likewise, Allegiant Air, the smallest carrier, operated at just 16% of its capacity a year prior. Hover over the graph to see the monthly totals for each airline.");
    infoParagraphGraph.text("There is cause for optimism, however, as vaccination rates continue to increase throughtout the United States and travel bans are lifted, airlines may see demand skyrocket.");


    let margin = ({ top: 200, right: 0, bottom: screenHeight / 4, left: 200 })
    let height = screenHeight;
    let width = screenWidth / 2;

    let x = d3.scaleUtc()
        .domain(d3.extent(data.dates))
        .range([margin.left, width - margin.right])

    let y = d3.scaleLinear()
        .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
        .range([height - margin.bottom, margin.top])

    let xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0))

    let yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(height / 80))
        .call(g => g.selectAll(".tick line").clone()
            .attr("stroke-opacity", 0.2)
            .attr("x2", width - margin.left - margin.right))
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick:not(:first-of-type) line")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-dasharray", "2,2"))
        .call(g => g.selectAll(".tick text")
            .attr("x", 4)
            .attr("dy", -4))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 10)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(data.y))

    let line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.dates[i]))
        .y(d => y(d))

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    const serie = svg.append("g")
        .selectAll("g")
        .data(data.series)
        .join("g");

    const airlineLine = serie.append("path")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke", d => airlineColor.get(d.name))
        .attr("d", d => line(d.values))

    const airlineLabels = serie.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(data.series)
        .join("text")
        .append("tspan")


    airlineLine.transition().duration(5000)
        .ease(d3.easeLinear)
        .attrTween("stroke-dasharray", function (d) {
            const length = this.getTotalLength();
            return d3.interpolate(`0,${length}`, `${length},${length}`);
        })
        .on("end", () => {
            svg.call(hover, airlineLine, x, y, data)
            airlineLabels.attr("class", "airline-dot-title")
                .attr("font-family", "sans-serif")
                .attr("font-size", 12)
                .attr("text-anchor", "middle")
                .attr("x", (d => x(new Date("2021-03-01"))))
                .attr("y", (d, i, data) => y(d.values[d.values.length - 1]))
                .text(d => d.name)
        });

    enableBtns();
}

async function createDonutChart() {

    disableBtns();

    let data = await d3.csv("../data/flights/processed_monthly_flights_airline.csv", d3.autoType);
    data = data.filter((d) => +d.year == 2019 && +d.month == 1);

    let margin = ({ top: 200, right: 0, bottom: screenHeight / 4, left: 200 })
    let height = screenHeight;
    let width = screenWidth / 2;

    let arc = d3.arc()
        .innerRadius(0)
        .outerRadius(Math.min(width, height) / 2 - 1)

    let pie = d3.pie()
        .padAngle(0.005)
        .sort(null)
        .value(d => +d.count)

    let color = d3.scaleOrdinal()
        .domain(data.map(d => d.airline))
        .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length).reverse())

    const arcs = pie(data.filter((d) => +d.year == 2019 && +d.month == 1));

    svg.selectAll("path")
        .data(arcs)
        .join("path")
        .attr("fill", d => color(d.data.airline))
        .attr("d", (arc))
        .append("title")
        .text(d => `${d.data.airline}: ${d.data.count.toLocaleString()}`);

    svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 12)
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(arcs)
        .join("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .call(text => text.append("tspan")
            .attr("y", "-0.4em")
            .attr("font-weight", "bold")
            .text(d => d.data.airline))
        .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
            .attr("x", 0)
            .attr("y", "0.7em")
            .attr("fill-opacity", 0.7)
            .text(d => d.data.count.toLocaleString()));

    enableBtns();

}