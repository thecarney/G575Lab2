/* J Carney, 2018 */

// initialize after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {
    //$("#splashModal").modal('show');
    main();

    // for testing, to load alternate scripts
    //getExternal();
}

// Main function uses async/await
function main() {
    // globals
    var attrArray = ["pctWhite", "pctMinority", "pctUnder30Min", "pct30to60Min", "pctOver60Min",
        "pctBachelorsOrHigher", "pctInPoverty", "perCapitaIncome", "pctRentalRate"];
    var expressed = attrArray[5]; // per capita income

    // load data
    loadData();

    // async/wait function to load data and draw the visualization
    async function loadData() {
        // make viz responsive
        $(window).resize(function(){
            try {
                drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia,
                    featuresCalifornia, featuresFrame, expressed, map);
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

        // make main viz container
        let map = d3.select("#mainCardMap")
            .append("svg")
            .attr("class", "map")
            .attr("width", '100%')  //width
            .attr("height", '100%')  //height
            .append("g");

        // make map
         drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia, featuresCalifornia,
             featuresFrame, expressed, map);
    }
}

// draws features, including on resize
function drawFeatures(dataTable, featCollBlockGroups, featuresBlockGroups, featCollCalifornia,
                      featuresCalifornia, featuresFrame, expressed, map) {
    // color scale
    let colorScale = makeColorScale(dataTable, expressed);

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
            return "blockGroups " + d.properties.GEOID_Data;
        })
        .style("fill", function(d){
            return colorScale(d.properties[expressed]);
        });

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

// color scale getter
function makeColorScale(data, expressed){
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
    for (let i=0; i<data.length; i++) {
        let val = parseFloat(data[i][expressed]);
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