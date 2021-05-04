const screenWidth = screen.width;
const screenHeight = screen.height;

let airlineColor = new Map([['DAL', '#E3132C'],
['JBU', '#003876'],
['UAL', '#005DAA'],
['SWA', '#F9B612'],
['AAL', '#0a92cc'],
['NKS', '#fcff2c'],
['FFT', '#248168'],
['UPS', '#644117'],
['FDX', '#4D148C'],
['SCX', '#F58232'],
['AAY', '#02569B'],
['SKW', '#003896']]);


function createMonthlyAirlineSeries(d) {
	let data = d;
	const columns = data.columns.slice(1);
	const airlines = [...new Set(data.map((d) => d.airline))]
	console.log(airlines)
	return {
		y: "Monthly Flight Count",
		series: airlines.map(d => ({
			name: d,
			values: data.filter((cd) => cd.airline === d).map((ld) => ld.count)
		})),
		dates: data.filter((cd) => cd.airline === data[0].airline).map((d) => new Date(d.year, d.month - 1))
	};
}

function dodge(positions, separation = 10, maxiter = 10, maxerror = 1e-1) {
	positions = Array.from(positions);
	let n = positions.length;
	if (!positions.every(isFinite)) throw new Error("invalid position");
	if (!(n > 1)) return positions;
	let index = d3.range(positions.length);
	for (let iter = 0; iter < maxiter; ++iter) {
		index.sort((i, j) => d3.ascending(positions[i], positions[j]));
		let error = 0;
		for (let i = 1; i < n; ++i) {
			let delta = positions[index[i]] - positions[index[i - 1]];
			if (delta < separation) {
				delta = (separation - delta) / 2;
				error = Math.max(error, delta);
				positions[index[i - 1]] -= delta;
				positions[index[i]] += delta;
			}
		}
		if (error < maxerror) break;
	}
	return positions;
}

function halo(text) {
	text.clone(true)
		.each(function () { this.parentNode.insertBefore(this, this.previousSibling); })
		.attr("fill", "none")
		.attr("stroke", "white")
		.attr("stroke-width", 4)
		.attr("stroke-linejoin", "round");
}

function hover(svg, path, x, y, data) {

	if ("ontouchstart" in document) svg
		.style("-webkit-tap-highlight-color", "transparent")
		.on("touchmove", moved)
		.on("touchstart", entered)
		.on("touchend", left)
	else svg
		.on("mousemove", moved)
		.on("mouseenter", entered)
		.on("mouseleave", left);

	const dot = svg.append("g")
		.attr("display", "none");

	dot.append("circle")
		.attr("r", 2.5);

	dot.append("text")
		.attr("class", "airline-dot-title")
		.attr("font-family", "sans-serif")
		.attr("font-size", 12)
		.attr("text-anchor", "middle")
		.attr("y", -20);

	dot.append("text")
		.attr("class", "airline-dot-value")
		.attr("font-family", "sans-serif")
		.attr("font-size", 10)
		.attr("text-anchor", "middle")
		.attr("y", -8);

	function moved(event) {
		event.preventDefault();
		const pointer = d3.pointer(event, this);
		const xm = x.invert(pointer[0]);
		const ym = y.invert(pointer[1]);
		const i = d3.bisectCenter(data.dates, xm);
		const s = d3.least(data.series, d => Math.abs(d.values[i] - ym));
		path.attr("stroke", d => d === s ? airlineColor.get(d.name) : "#ddd").filter(d => d === s).raise();
		dot.attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`);
		dot.select(".airline-dot-title").text(s.name);
		dot.select(".airline-dot-value").text(formatNumber(s.values[i]))
	}

	function entered() {
		path.style("mix-blend-mode", null).attr("stroke", "#ddd");
		dot.attr("display", null);
	}

	function left() {
		path.attr("stroke", d => airlineColor.get(d.name))
		dot.attr("display", "none");
	}
}

function createRoutePaths(data) {
	routes = Array();
	for (var i = 0, len = data.length; i < len; i++) {
		let route = data[i];
		routes.push({
			type: "LineString",
			coordinates: [
				[route.origin_lon, route.origin_lat],
				[route.dest_lon, route.dest_lat]
			],
			weight: route.count,
			start: route.origin,
			end: route.dest
		});
	}
	return routes;
}

function weekFilter(data, week, year) {
	return data.filter(d => d.week == week && d.year == year);
}

function monthFilter(data, month, year) {
	return data.filter(d => d.month == month && d.year == year);
}

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleep(val) {
	await timeout(val);
}

function nextStage() {
	currentStage += 1;
	removeElements();
	updateStage(currentStage);
}

function lastStage() {
	if (currentStage > 0) {
		currentStage -= 1;
	}
	removeElements()
	updateStage(currentStage);
}

function updateStage(stage) {
	if (stage == 1) {
		createMapSpikeGraph();
	} else if (stage == 2) {
		createMonthlyFlightsLineGraph();
	} else if (stage == 3) {
		createChangeChart();
	} else if (stage == 4) {
		createAirlineGraph();
	} else if (stage == 5) {
		createSlopeGraph();
	} else if (stage == 6){
		end();
	} else {
		currentStage = 0;
		svg.attr("viewBox", [0, 0, 1200, 1200])
		createMapFlightRoutes();
	}
}

function removeElements() {
	svg.selectAll('*').remove();
}

function disableBtns() {
	nextbtn.classList.add("disabled");
	backbtn.classList.add("disabled");
}

function enableBtns() {
	nextbtn.classList.remove("disabled");
	backbtn.classList.remove("disabled");
}


function formatNumber(num) {
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

function format(x) {
	const f = d3.format("+.0%");
	return x => x === 1 ? "0%" : f(x - 1);
}

String.prototype.hashCode = function () {
	var hash = 0;
	if (this.length == 0) {
		return hash;
	}
	for (var i = 0; i < this.length; i++) {
		var char = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}