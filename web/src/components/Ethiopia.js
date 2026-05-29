import React, { useRef, useEffect, useState } from "react";
import { select, geoPath, geoMercator, min, max, scaleLinear, geoContains } from "d3";
import useResizeObserver from "./useResizeObserver";
import {
  Card,SvgIcon ,
} from '@mui/material';
/**
 * Component that renders a map of Germany.
 */

function Ethiopia({ data, }) {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // will be called initially and on every data change
  useEffect(() => {
    const svg = select(svgRef.current);

    const minProp = 0;
    const maxProp = data.features.length;
    const colorScale = scaleLinear()
      .domain([minProp, maxProp])
      .range(["yellow", "darkgreen"]);

    // use resized dimensions
    // but fall back to getBoundingClientRect, if no dimensions yet.
    const { width, height } =
      dimensions || wrapperRef.current.getBoundingClientRect();
    console.log(width, height);
    // projects geo-coordinates on a 2D plane
    const projection = geoMercator()
      .fitSize([width, 400], selectedCountry || data)
      .precision(100);

    // takes geojson data,
    // transforms that into the d attribute of a path element
    const pathGenerator = geoPath().projection(projection);
    const div = select('.tooltip');
    // render each country

    
    svg
      .selectAll(".country")
      .data(data.features)
      .join("path")
      .on("click", (d,feature) => {
        setSelectedCountry(selectedCountry === feature ? null : feature);
      })
      .attr("class", "country")      
      .attr("fill", (feature,i) => colorScale(i))
      .attr("d", feature => pathGenerator(feature))
      .on("mouseover", (d,feature) => {        
        const [long, lat] = projection.invert(pathGenerator.centroid(feature));
        div.style("opacity", .9);		
        div.html(`${feature.properties.NAME_1}` + 
          "<br/>" + `${long},${lat}`)	
            .style("left", d.clientX + "px")		
            .style("top", d.clientY + "px");	
        })					
    .on("mouseout", function() {		
        div.style("opacity", 0);	
    })

    // render text
    svg
      .selectAll(".label")
      .data([selectedCountry])
      .join("text")
      .attr("class", "label")
      .text(
        (feature) =>
         console.log(feature)
      )
      .attr("x", 10)
      .attr("y", 25);
  }, [data, dimensions, selectedCountry]);

  return (
    <Card ref={wrapperRef} raised={true} height="400px">
      <SvgIcon viewBox="0 0 50 30" ref={svgRef}></SvgIcon>
      <div className="tooltip" style={{	
            position: 'absolute',
            textAlign: 'center',			
            width: '150px',					
            height: '28px',					
            padding: '2px',				
            font: '12px sans-serif',		
            background: 'lightsteelblue',	
            border: '0px',	
            borderRadius: '8px',			
            pointerEvents: 'none',
            opacity: 0,			
        }}></div>
    </Card>
  );
}

export default Ethiopia;
