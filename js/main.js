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

    // make viz
    makeViz();

    // async/wait function to load data and draw the visualization
    async function makeViz() {
        // make viz responsive
        d3.select(window)
            .on("resize", drawFeatures);

        // load data from csv
        const dataTable = await d3.csv("data/tabularData.csv");

        // load topologies
        const topologyBlockGroups = await d3.json("data/LivermoreBlockGroups.topojson");
        const topologyCalifornia = await d3.json("data/California.topojson");
        const topologyFrame = await d3.json("data/Inset.topojson");

        // get feature collections and features if needed
          // block groups for viz
        var featCollBlockGroups = topojson
            .feature(topologyBlockGroups, topologyBlockGroups.objects.LivermoreBlockGroups_4326);
        var featuresBlockGroups = featCollBlockGroups.features;
          // for inset map
        var featCollCalifornia = topojson
            .feature(topologyCalifornia, topologyCalifornia.objects.California);
        var featuresCalifornia = featCollCalifornia.features;
        var featCollFrame = topojson
            .feature(topologyFrame, topologyFrame.objects.Inset);
        var featuresFrame = featCollFrame.features;

        // make main viz container
        let width = parseInt(d3.select("#mainCardMap").style('width'));
        let height = parseInt(d3.select("#mainCardMap").style('height'));
        var map = d3.select("#mainCardMap")
            .append("svg")
            .attr("class","map")
            .attr("width", '100%')  //width
            .attr("height", '100%')  //height
            .append("g");

        // call function that draws features
        drawFeatures();

        // draws features, including on resize
        function drawFeatures() {
            // block groups
            let w1 = parseInt(d3.select("#mainCardMap").style('width'));
            let h1 = parseInt(d3.select("#mainCardMap").style('height'));
            let proj1 = d3.geoAlbersUsa().scale(1).fitExtent([[5, 5], [w1, h1]], featCollBlockGroups);
            let geoPath1 = d3.geoPath().projection(proj1);
            //d3.select("g").selectAll("path").remove();
            d3.select(".map").select("g").selectAll("path").remove();  // clear features
            let blockGroups = map.selectAll(".blockGroups") // draw features again
                .data(featuresBlockGroups)
                .enter()
                .append("path")
                .attr("d", geoPath1)
                .attr("class", function(d){
                    return "blockGroups " + d.properties.GEOID_Data;
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
    }
}

// load other JS files if needed
function getExternal() {
    $.getScript("js/geojson.js", function() {
        console.log("external script loaded");
    });
}


