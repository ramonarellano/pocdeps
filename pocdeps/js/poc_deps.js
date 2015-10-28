//Comment
var csvFile = "csv/v02.csv";

console.log("Hello me!");
console.log("Hello");

function lookup(link, data) {
    return _.chain(data)
        .filter(function (d) {
            return d.ID === link
        })
        .map(function (d) {
            return d.seq
        })
        .first().value();
        
}

//Retrieves status value from text in data
function findStatus(status){
 
  switch(status.substring(0,1)) {
    case '0':
        return 'new';
    case '1':
        return 'active';
    case '4':
    default:
        return 'done';
    } 
}

//Transforms data and creates one element per dependency in the original CSV
function transform(data){
    return _.chain(data).map(function (d) {
        var tmp = d.Avhenger + '';
        return row = _.chain(tmp.split(","))
            .filter(function(l){ return !_.isUndefined(l) && !_.isEmpty(l) && l != 0})
            .map(function (lnk){
                return { 
                    source : d.Id,
                    target: lnk.trim(),
                    status: findStatus(d.Status),
                    avklaring: fixAvklaring(d.Avklaring),
                    strm: d.Strom
                }
            }).value();
    
    }).flatten().value(); 
}

//Removes everything before - in the field Avklaring
function fixAvklaring(avklaring) {

    if(avklaring.indexOf(" - ") != -1) {
        avklaring = avklaring.substring(avklaring.indexOf(" - ") + 2, avklaring.length);
    }

    if(avklaring.length > 30) {
      avklaring = avklaring.substr(0, 30) + "...";
    }

    return avklaring;
}

//Remove nodes that are completed
function removeByClass(className) {
    d3.selectAll("." + className).data([]).exit().remove();
}

//Parses the CSV file, transforms the data into a list of links and calls render graph
Papa.parse(csvFile, {
    download: true, header: true, dynamicTyping: true, delimiter: ';', complete: function (results) {
        render(transform(results.data));
    }
});

//Renders the graph
function render(links){

    var nodes = {};
    
    // Compute the distinct source nodes from the links.
    links.forEach(function(link) {
        if (_.isUndefined(nodes[link.source])) {
            nodes[link.source] = {name: link.source, status :link.status, avklaring: link.avklaring, strm: link.strm};
        }
        
        link.source = nodes[link.source];
    });
    
    // Compute the nodes that are only targets and not sources (should be only PoCs) from the links.
    links.forEach(function(link) {
        if (_.isUndefined(nodes[link.target])) {
            nodes[link.target] = {name: link.target, status : "", avklaring: "", strm: ""};
        }
        
        link.target = nodes[link.target];
        console.log("test");
    });
    
    var width = 1600,
        height = 1000;
        
    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-500)
        .on("tick", tick)
        .start();
    
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
    
    // Per-type markers, as they don't inherit styles.
    svg.append("defs").selectAll("marker")
        .data(["active", "new", "done"])
      .enter().append("marker")
        .attr("id", function(d) {  return d; })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 9)
        .attr("markerHeight", 9)
        .attr("orient", "auto")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5");
    
    var path = svg.append("g").selectAll("path")
        .data(force.links())
      .enter().append("path")
        .attr("class", function(d) { return "link " + d.status + " " + d.strm; })
        .attr("marker-end", function(d) { return "url(#" + d.status + ")"; });
    
    var rect = svg.append("g").selectAll("rect")
        .data(force.nodes())
      .enter().append("rect")
        .attr("height", 20)
        .attr("width", 100) //Is set dynamically later
        .attr("class", function(d) { return "rect " + d.status + " " + d.strm;})
        .call(force.drag);
    
    var text = svg.append("g").selectAll("text")
        .data(force.nodes())
      .enter().append("text")
        .attr("x", 6)
        .attr("y", 13) //".31em")
        .attr("id", function(d) { return d.name; })
        .attr("class", function(d) { return "text " + d.status + " " + d.strm;})
        .text(function(d) { return d.name + " " + d.avklaring; });
    
    //Set box size according to text length
    rect.attr("width", function(d) { return document.getElementById(d.name).getComputedTextLength() + 15; });
    
    // Use elliptical arc path segments to doubly-encode directionality.
    function tick() {
      path.attr("d", linkArc);
      rect.attr("transform", transform);
      text.attr("transform", transform);
    }
    
    function linkArc(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    }
    
    function transform(d) {
      return "translate(" + d.x + "," + d.y + ")";
    }

}

