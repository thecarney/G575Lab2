/* J Carney, 2018 */

// initialize after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {
    //$("#splashModal").modal('show');
    main();
}

// Main function uses async/await
function main() {
    // globals
    var attrArray = ["pctWhite", "pctMinority", "pctUnder30Min", "pct30to60Min", "pctOver60Min",
        "pctBachelorsOrHigher", "pctInPoverty", "perCapitaIncome", "pctRentalRate"];
    var expressed = attrArray[0];

    // load data
    loadData();

    // async/wait function to load data and draw the visualization
    async function loadData() {
        // make viz responsive
        $(window).resize(function(){
            try {
                drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia,
                    featuresCalifornia, featuresFrame, expressed, map, colorScale);
                d3.select(".chart").remove();
                setChart(dataTable, colorScale, 0);
            } catch(e) {
                //pass
            }
        });

        // var listeners
        $('input[name=groupRadioVariables]').click(function(){
            // get the new radio and set global vars
            let radioName = $('input[name=groupRadioVariables]:checked').attr('id');

            // set new expressed var
            switch (radioName) {
                case "radio1":
                    expressed = attrArray[0];
                    $("#chart1Title").text('Percent White Alone');
                    break;
                case "radio2":
                    expressed = attrArray[1];
                    $("#chart1Title").text('Percent Hispanic/Latino or not White Alone');
                    break;
                case "radio3":
                    expressed = attrArray[2];
                    $("#chart1Title").text('Percent commuting less than 30 minutes');
                    break;
                case "radio4":
                    expressed = attrArray[3];
                    $("#chart1Title").text('Percent commuting 30 to 60 minutes');
                    break;
                case "radio5":
                    expressed = attrArray[4];
                    $("#chart1Title").text('Percent commuting over 60 minutes');
                    break;
                case "radio6":
                    expressed = attrArray[6];
                    $("#chart1Title").text('Percent in poverty');
                    break;
                case "radio7":
                    expressed = attrArray[7];
                    $("#chart1Title").text('Per capita income ($1000)');
                    break;
                case "radio8":
                    expressed = attrArray[5];
                    $("#chart1Title").text('Percent with bachelor\'s degree or higher');
                    break;
                case "radio9":
                    expressed = attrArray[8];
                    $("#chart1Title").text('Percent renter-occupied housing units');
                    break;
            }

            // redraw the viz
            try {
                // color scale
                let colorScale = makeColorScale(dataTable, expressed);
                updateDrawFeatures(dataTable, expressed, colorScale);
                setChart(dataTable, colorScale, 1);
            } catch(e) {
                //pass
            }
        });

        // load data from csv
        let dataTable = await d3.csv("data/tabularData.csv");

        // load topologies
        let topologyBlockGroups = await d3.json("data/LivermoreBlockGroups.topojson");
        let topologyCalifornia = await d3.json("data/California.topojson");
        let topologyFrame = await d3.json("data/Inset.topojson");

        // get feature collections and features if needed
        // block groups for viz
        let featCollBlockGroups = topojson
            .feature(topologyBlockGroups, topologyBlockGroups.objects.LivermoreBlockGroups_4326);
        let featuresBlockGroups = featCollBlockGroups.features;

        // for inset map
        let featCollCalifornia = topojson
            .feature(topologyCalifornia, topologyCalifornia.objects.California);
        let featuresCalifornia = featCollCalifornia.features;
        let featCollFrame = topojson
            .feature(topologyFrame, topologyFrame.objects.Inset);
        let featuresFrame = featCollFrame.features;

        // append csv attributes to geojson
        for (let i = 0; i < dataTable.length; i++) {
            let tblRow = dataTable[i]; // get row
            let rowID = tblRow.GEOID; // get row ID
            for (let a = 0; a < featuresBlockGroups.length; a++) {
                let featProperties = featuresBlockGroups[a].properties; // get feature
                let featID = featProperties.GEOID_Data; // get feature ID
                if (featID == rowID) { // on match...
                    attrArray.forEach(function (attr) {
                        let val = parseFloat(tblRow[attr]); // get attribute
                        featProperties[attr] = val; // set attribute
                    });
                }
            }
        }

        // make main map container
        let map = d3.select("#mainCardMap")
            .append("svg")
            .attr("class", "map")
            .attr("width", '100%')  //width
            .attr("height", '100%')  //height
            .append("g");

        // color scale
        let colorScale = makeColorScale(dataTable, expressed);

        // make map
        drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia, featuresCalifornia,
             featuresFrame, expressed, map, colorScale);

        // make corresponding chart
        setChart(dataTable, colorScale, 0);
    }

    // draws features, including on resize
    function drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia,
                          featuresCalifornia, featuresFrame, expressed, map, colorScale) {
        // block groups
        let w1 = parseInt(d3.select("#mainCardMap").style('width'));
        let h1 = parseInt(d3.select("#mainCardMap").style('height'));
        let proj1 = d3.geoAlbersUsa().scale(1).fitExtent([[5, 5], [w1, h1]], featCollBlockGroups);
        let geoPath1 = d3.geoPath().projection(proj1);

        // clear old
        d3.select(".map").select("g").selectAll("path").remove();

        // draw again
        let blockGroups = map.selectAll(".blockGroups")
            .data(featuresBlockGroups)
            .enter()
            .append("path")
            .attr("d", geoPath1)
            .attr("class", function(d){
                return "blockGroups bg" + d.properties.GEOID_Data;
            })
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                map.selectAll("path").filter(".blockGroups")
                    .sort(function (a){
                        if (a != d) {
                            return -1;
                        } else {
                            return 1;
                        }
                });
                highlight(d.properties, "GEOID_Data");
                setLabel(d.properties, "GEOID_Data");
            })
            .on("mouseout", function(d){
                highlight(d.properties, "GEOID_Data");
                d3.selectAll(".infoLabel").remove();
            })
            .on("mousemove", moveLabel);

        // inset base
        let w2 = 50;
        let h2 = 100;
        let t = h1-h2;
        let proj2 = d3.geoAlbersUsa().scale(1).fitExtent([[1, 1], [w2, h2]], featCollCalifornia);
        let geoPath2 = d3.geoPath().projection(proj2);
        let california = map.selectAll(".california")
            .data(featuresCalifornia)
            .enter()
            .append("path")
            .attr("d", geoPath2)
            .attr("class","california")
            .attr("transform", "translate(5,"+t+")");
        let frame = map.selectAll(".frame")
            .data(featuresFrame)
            .enter()
            .append("path")
            .attr("d", geoPath2)
            .attr("class", "frame")
            .attr("transform", "translate(5,"+t+")");
    }

    function updateDrawFeatures(dataTable, expressed, colorScale){
        let updateBlockGroups = d3.selectAll(".blockGroups")
            .transition()
            .duration(2000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
    }

    // create coord viz chart
    function setChart(dataTable, colorScale, callType){

        // widths
        let leftPad = 25;
        let botPad = 20;
        let w1 = parseInt(d3.select("#coordVizCardContent").style('width'));
        let w2 = parseInt(d3.select("#coordVizCardContent").style('width'))-leftPad;
        let h1 = parseInt(d3.select("#coordVizCardContent").style('height'));
        let h2 = parseInt(d3.select("#coordVizCardContent").style('height'))-botPad;

        // calculate range/domains
        let domainBarMin = 0;
        let domainBarMax = 1;
        let domainYAxisMin = 0;
        let domainYAxisMax = 100;
        if (expressed == "perCapitaIncome") { // one attribute is in dollars, so have to change domains
            dataTable.forEach(function(d){
                d[expressed] = parseFloat(d[expressed]);
            });
            domainBarMax = Math.ceil(d3.max(dataTable, function(d){return d[expressed]})/10000)*10000;
            domainYAxisMax = domainBarMax/1000;
        } else {
            domainBarMin = 0;
            domainBarMax = 1;
            domainYAxisMin = 0;
            domainYAxisMax = 100;
        }
        // y axis
        let yAxis = d3.scaleLinear().range([h2, 0]).domain([domainYAxisMin,domainYAxisMax]);

        // y axis scale
        let yScale = d3.scaleLinear().range([0, (h2)]).domain([domainBarMin,domainBarMax]);

        // declare vars for init/update calls
        let bars;
        let updateBars;
        let chart;
        let updateChart;

        // process at init or update call
        if (callType == 1) {
            // update
            updateBars = d3.selectAll(".bars")
                .sort(function(a,b){
                    return b[expressed] - a[expressed];
                })
                .transition()
                .delay(function(d, i){
                    return i *20;
                })
                .duration(5)
                .attr("x", function(d, i){
                    return i * (w2 / dataTable.length) + leftPad+2;
                })
                .attr("height", function(d){
                    return yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d){
                    return (h2) - yScale(parseFloat(d[expressed])) + botPad/2;
                })
                .style("fill", function(d){
                    return choropleth(d, colorScale);
                });
            // update axis
            d3.selectAll(".axis")
                .attr("transform", "translate("+leftPad+","+botPad/2+")")
                .call(d3.axisLeft(yAxis));
        } else {
            // init

            // chart container
            chart = d3.select("#coordVizCardContent")
                .append("svg")
                .attr("width", w1)
                .attr("height", h1)
                .attr("class", "chart")
                .append("g");

            // bars
            bars = chart.selectAll(".bars")
                .data(dataTable)
                .enter()
                .append("rect")
                .sort(function(a,b){
                    return b[expressed]-a[expressed];
                })
                .attr("class", function(d){
                    return "bars bg" + d.GEOID;
                })
                .attr("width", w2 / dataTable.length -1)
                .attr("x", function(d, i){
                    return i * (w2 / dataTable.length) + leftPad+2;
                })
                .attr("height", function(d){
                    return yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d){
                    return (h2) - yScale(parseFloat(d[expressed])) + botPad/2;
                })
                .style("fill", function(d){
                    return choropleth(d, colorScale);
                })
                //.on("mouseover", highlight)
                .on("mouseover", function(d) {
                    let map = d3.select("#mainCardMap");
                    let idDataTable = d.GEOID;
                    d3.select("#mainCardMap").selectAll("path").filter(".blockGroups")
                        .sort(function (a) {
                            let idBlockGroup = a.properties.GEOID_Data;
                            if (idBlockGroup != idDataTable) {
                                return -1;
                            } else {
                                return 1;
                            }
                        });
                    highlight(d,"GEOID");
                    setLabel(d, "GEOID");
                })
                .on("mouseout", function(d){
                    highlight(d, "GEOID");
                    d3.selectAll(".infoLabel").remove();
                })
                .on("mousemove", moveLabel);

            // axis
            chart.append("g")
                .attr("class", "axis")
                .attr("transform", "translate("+leftPad+","+botPad/2+")")
                .call(d3.axisLeft(yAxis));
        }
    }

    // highlight on mouseover
    function highlight(props, fieldName){
        //change stroke
        let selected = d3.selectAll(".bg"+props[fieldName]);
        selected.classed("highlight", !selected.classed("highlight"));
    }

    // tooltips
    function setLabel(props, fieldName){
        // content
        let labelAttribute = "<h3>" + props[expressed] + "</h3><b>" + expressed + "</b>";

        // div
        let infoLabel = d3.select("body")
            .append("div")
            .attr("class", "infoLabel")
            .attr("id", props[fieldName] + "_label")
            .html(labelAttribute);

        let bgName = infoLabel.append("div")
            .attr("class", "labelName")
            .html(props[fieldName]);

    }

    // mouse movements
    function moveLabel(){
        // label width
        let labelWidth = d3.select(".infoLabel")
            .node()
            .getBoundingClientRect()
            .width;

        // mouse coords
        let x1 = d3.event.clientX +10;
        let y1 = d3.event.clientY -75;
        let x2 = d3.event.clientX - labelWidth -10;
        let y2 = d3.event.clientY +25;

        let x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2: x1;
        let y = d3.event.clientY < 150 ? y2 : y1;

        d3.select(".infoLabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }


    // color scale getter
    function makeColorScale(dataTable, expressed){
        // available ranges
        let green = ["#edf8e9","#bae4b3","#74c476","#31a354","#006d2c"]; // income
        let gray = ["#f7f7f7","#cccccc","#969696","#636363","#252525"]; // poverty
        let blue = ["#eff3ff","#bdd7e7","#6baed6","#3182bd","#08519c"]; // education
        let red = ["#fee5d9","#fcae91","#fb6a4a","#de2d26","#a50f15"]; // commute time
        let purple = ["#f2f0f7","#cbc9e2","#9e9ac8","#756bb1","#54278f"]; // race
        let orange = ["#feedde","#fdbe85","#fd8d3c","#e6550d","#a63603"]; // rental rate

        // get color for expressed attr
        let colorArrays = ["pctWhite",purple,"pctMinority",purple,"pctUnder30Min",red,
            "pct30to60Min",red,"pctOver60Min",red,"pctBachelorsOrHigher",blue,
            "pctInPoverty",gray,"perCapitaIncome",green,"pctRentalRate",orange];
        let chosenColor = colorArrays[colorArrays.indexOf(expressed)+1];

        // d3 scale
        let colorScale = d3.scaleThreshold().range(chosenColor);

        // array of attribute's values
        let domainArray = [];
        for (let i=0; i<dataTable.length; i++) {
            let val = parseFloat(dataTable[i][expressed]);
            domainArray.push(val);
        }

        // clustering
        let clusters = ss.ckmeans(domainArray, 5);

        // reset to mins
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });

        // remove first value
        domainArray.shift();

        // last 4 mins to domain
        colorScale.domain(domainArray);
        return colorScale;
    }

    // color helper
    function choropleth(props, colorScale) {
        let val = parseFloat(props[expressed]);
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        }
    }
}