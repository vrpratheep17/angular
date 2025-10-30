import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-jarvis-graph',
  templateUrl: './jarvis-graph.component.html',
  styleUrls: ['./jarvis-graph.component.css'],
})
export class JarvisGraphComponent implements AfterViewInit {
  @ViewChild('svgEl', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;
  private viewportGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;

  // We’ll pretend this is our "main person"
  private rootData = {
    id: 'person-root',
    avatarUrl: 'https://i.pravatar.cc/200?img=32',
    x: 0,
    y: 0,
  };

  ngAfterViewInit(): void {
    const svg = d3.select(this.svgRef.nativeElement);
    this.viewportGroup = svg.select<SVGGElement>('g.viewport');

    // 1. SET UP ZOOM / PAN
    this.zoomBehavior = d3
      .zoom<Element, unknown>()
      .scaleExtent([0.3, 1.5])
      .on('zoom', (event) => {
        this.viewportGroup.attr('transform', event.transform.toString());
      });

    svg.call(this.zoomBehavior as any);

    // 2. INITIAL CAMERA (similar to setViewport in ReactFlow)
    const start = d3.zoomIdentity.translate(0, 0).scale(0.65);
    svg.call(this.zoomBehavior.transform as any, start);

    // 3. DRAW CONTENT
    this.drawRootAvatarNode();
  }

  /**
   * Draw the main avatar node at this.rootData.(x,y)
   * This node is basically:
   * - outer glow / shadow circle
   * - rounded container
   * - <image> clipped as a circle
   * and it will be clickable later.
   */
  private drawRootAvatarNode() {
    const { x, y, avatarUrl } = this.rootData;

    // group for the avatar node
    const nodeG = this.viewportGroup
      .append('g')
      .attr('class', 'jarvis-node avatar-node')
      .attr('transform', `translate(${x},${y})`)
      .style('cursor', 'pointer');

    // subtle shadow/glow background circle
    nodeG
      .append('circle')
      .attr('r', 48) // outer radius
      .attr('fill', '#ffffff')
      .attr('stroke', 'rgba(15,23,42,0.08)')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0px 10px 24px rgba(2,6,23,0.15))');

    // inner ring (like the blue border in your React avatar)
    nodeG
      .append('circle')
      .attr('r', 40)
      .attr('fill', 'none')
      .attr('stroke', '#0EA5E9')
      .attr('stroke-width', 3);

    // circular clipped avatar image
    // We'll create a clipPath so the avatar image is round.
    const clipId = `clip-${this.rootData.id}`;
    this.viewportGroup
      .append('clipPath')
      .attr('id', clipId)
      .append('circle')
      .attr('r', 40)
      .attr('cx', x)
      .attr('cy', y);

    nodeG
      .append('image')
      .attr('href', avatarUrl)
      .attr('x', -40)
      .attr('y', -40)
      .attr('width', 80)
      .attr('height', 80)
      .attr('clip-path', `url(#${clipId})`);

    // (Optional for debugging) label under it
    nodeG
      .append('text')
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffffff')
      .attr('font-size', 14)
      .attr('font-weight', 600)
      .text('Tony Jarvis');

    // TODO (later): add click handler for expanding the info card
    nodeG.on('click', () => {
      console.log('TODO: open info card for', this.rootData.id);
    });
  }
}
