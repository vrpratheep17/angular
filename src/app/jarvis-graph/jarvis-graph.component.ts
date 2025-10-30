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
  private infoGroup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null;
  private connectorPath: d3.Selection<
    SVGPathElement,
    unknown,
    null,
    undefined
  > | null = null;
  private cardPosition: { x: number; y: number } | null = null;
  private cardSize = { width: 0, height: 0 };
  private projectsGroup: d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null = null;
  private projectConnectors: Array<
    d3.Selection<SVGPathElement, unknown, null, undefined>
  > = [];
  private projectsOffset = { x: 0, y: 0 };
  private projectCardSize = { width: 220, height: 56 };
  private projectGap = 12;

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

    // Toggle info card on avatar click
    nodeG.on('click', (event) => {
      event.stopPropagation();
      if (this.infoGroup) {
        this.closeInfoCard();
      } else {
        this.openInfoCard(x, y);
      }
    });
  }

  private openInfoCard(srcX: number, srcY: number) {
    const cardWidth = 280;
    const cardHeight = 170;
    const offsetX = 130; // how far to the right of avatar
    const offsetY = -85; // vertically center relative to avatar
    const cardX = srcX + offsetX;
    const cardY = srcY + offsetY;

    // Cache size and position for dragging and connector updates
    this.cardSize = { width: cardWidth, height: cardHeight };
    this.cardPosition = { x: cardX, y: cardY };

    this.connectorPath = this.viewportGroup
      .append('path')
      .attr('class', 'connector')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.35)')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', '4,4');

    // Create card group
    const g = this.viewportGroup
      .append('g')
      .attr('class', 'info-card')
      .attr('transform', `translate(${cardX},${cardY})`)
      .on('click', (ev) => ev.stopPropagation());

    // Make the card draggable and keep connector attached
    const dragBehavior = d3
      .drag<SVGGElement, unknown>()
      .on('start', (event) => {
        // Prevent background handlers (like close) from firing
        (event.sourceEvent as any)?.stopPropagation?.();
      })
      .on('drag', (event: any) => {
        if (!this.cardPosition) return;
        this.cardPosition.x += event.dx;
        this.cardPosition.y += event.dy;
        g.attr(
          'transform',
          `translate(${this.cardPosition.x},${this.cardPosition.y})`
        );
        this.updateConnector();
      });

    (g as any).call(dragBehavior as any);

    // Card background
    g.append('rect')
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('width', cardWidth)
      .attr('height', cardHeight)
      .attr('fill', '#ffffff')
      .attr('stroke', 'rgba(15,23,42,0.12)')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0px 16px 28px rgba(2,6,23,0.20))');

    // Text content
    const padX = 16;
    let cursorY = 20;

    g.append('text')
      .attr('x', padX)
      .attr('y', cursorY)
      .attr('fill', '#0f172a')
      .attr('font-size', 16)
      .attr('font-weight', 700)
      .text('Tony Jarvis');

    cursorY += 22;
    g.append('text')
      .attr('x', padX)
      .attr('y', cursorY)
      .attr('fill', '#334155')
      .attr('font-size', 13)
      .text('tony.jarvis@example.com');

    cursorY += 18;
    g.append('text')
      .attr('x', padX)
      .attr('y', cursorY)
      .attr('fill', '#334155')
      .attr('font-size', 13)
      .text('+1 (555) 012-3456');

    // Divider line above buttons
    g.append('line')
      .attr('x1', 0)
      .attr('x2', cardWidth)
      .attr('y1', cardHeight - 56)
      .attr('y2', cardHeight - 56)
      .attr('stroke', 'rgba(15,23,42,0.08)');

    // Buttons
    const buttonsY = cardHeight - 44;
    const btnGap = 12;
    const btnWidth = 116;
    const btnHeight = 34;

    const drawButton = (
      x: number,
      label: string,
      variant: 'primary' | 'ghost'
    ) => {
      const btn = g
        .append('g')
        .attr('class', `btn ${variant}`)
        .style('cursor', 'pointer')
        .attr('transform', `translate(${x},${buttonsY})`)
        .on('click', (ev) => {
          ev.stopPropagation();
          if (label === 'Projects') {
            this.toggleProjects();
          } else if (label === 'Team') {
            console.log('Team clicked');
          }
        });

      btn
        .append('rect')
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('width', btnWidth)
        .attr('height', btnHeight)
        .attr('fill', variant === 'primary' ? '#0EA5E9' : '#ffffff')
        .attr(
          'stroke',
          variant === 'primary' ? '#0EA5E9' : 'rgba(15,23,42,0.18)'
        )
        .attr('stroke-width', 1);

      btn
        .append('text')
        .attr('x', btnWidth / 2)
        .attr('y', btnHeight / 2 + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', variant === 'primary' ? '#ffffff' : '#0f172a')
        .attr('font-size', 14)
        .attr('font-weight', 600)
        .text(label);
    };

    drawButton(padX, 'Projects', 'primary');
    drawButton(padX + btnWidth + btnGap, 'Team', 'ghost');

    this.infoGroup = g;

    // Initial connector path
    this.updateConnector();

    // Clicking anywhere else on the SVG closes the card
    d3.select(this.svgRef.nativeElement).on('click.infoClose', () => {
      this.closeInfoCard();
    });
  }

  private closeInfoCard() {
    if (this.infoGroup) {
      this.infoGroup.remove();
      this.infoGroup = null;
    }
    if (this.connectorPath) {
      this.connectorPath.remove();
      this.connectorPath = null;
    }
    this.cardPosition = null;
    this.closeProjects();
    d3.select(this.svgRef.nativeElement).on('click.infoClose', null);
  }

  private updateConnector() {
    if (!this.connectorPath || !this.cardPosition) return;
    const start = { x: this.rootData.x + 48, y: this.rootData.y };
    const end = {
      x: this.cardPosition.x,
      y: this.cardPosition.y + this.cardSize.height / 2,
    };
    const midX = (start.x + end.x) / 2;
    const d = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    this.connectorPath.attr('d', d);

    // Update project connectors and group position if present
    if (this.projectsGroup && this.cardPosition) {
      // Reposition projects group to stay attached to the card
      const baseX = this.cardPosition.x + this.projectsOffset.x;
      const baseY = this.cardPosition.y + this.projectsOffset.y;
      this.projectsGroup.attr('transform', `translate(${baseX},${baseY})`);

      const cardRightX = this.cardPosition.x + this.cardSize.width;
      this.projectConnectors.forEach((sel, i) => {
        const projEndY =
          baseY +
          i * (this.projectCardSize.height + this.projectGap) +
          this.projectCardSize.height / 2;
        const start2 = { x: cardRightX, y: projEndY };
        const end2 = { x: baseX, y: projEndY };
        const midX2 = (start2.x + end2.x) / 2;
        const d2 = `M ${start2.x} ${start2.y} C ${midX2} ${start2.y}, ${midX2} ${end2.y}, ${end2.x} ${end2.y}`;
        sel.attr('d', d2);
      });
    }
  }

  private toggleProjects() {
    if (this.projectsGroup) {
      this.closeProjects();
    } else {
      this.openProjects();
    }
  }

  private openProjects() {
    if (!this.cardPosition) return;
    // Position projects to the right of the info card
    this.projectsOffset = { x: this.cardSize.width + 40, y: 8 };
    const baseX = this.cardPosition.x + this.projectsOffset.x;
    const baseY = this.cardPosition.y + this.projectsOffset.y;

    const items = [
      { name: 'Jarvis Core' },
      { name: 'Analytics Dashboard' },
      { name: 'AI Assist' },
    ];

    // Create connectors first so they appear below cards
    this.projectConnectors.forEach((c) => c.remove());
    this.projectConnectors = [];
    const cardRightX = this.cardPosition.x + this.cardSize.width;
    items.forEach((_, i) => {
      const endY =
        baseY +
        i * (this.projectCardSize.height + this.projectGap) +
        this.projectCardSize.height / 2;
      const start2 = { x: cardRightX, y: endY };
      const end2 = { x: baseX, y: endY };
      const midX2 = (start2.x + end2.x) / 2;
      const d2 = `M ${start2.x} ${start2.y} C ${midX2} ${start2.y}, ${midX2} ${end2.y}, ${end2.x} ${end2.y}`;
      const path = this.viewportGroup
        .append('path')
        .attr('class', 'connector-project')
        .attr('d', d2)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.35)')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', '4,4');
      this.projectConnectors.push(path);
    });

    // Create projects group
    const g = this.viewportGroup
      .append('g')
      .attr('class', 'projects')
      .attr('transform', `translate(${baseX},${baseY})`)
      .on('click', (ev) => ev.stopPropagation());

    items.forEach((item, i) => {
      const y = i * (this.projectCardSize.height + this.projectGap);
      const pg = g
        .append('g')
        .attr('class', 'project-card')
        .attr('transform', `translate(0,${y})`);

      // Card background
      pg.append('rect')
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('width', this.projectCardSize.width)
        .attr('height', this.projectCardSize.height)
        .attr('fill', '#ffffff')
        .attr('stroke', 'rgba(15,23,42,0.12)')
        .attr('stroke-width', 1)
        .style('filter', 'drop-shadow(0px 10px 20px rgba(2,6,23,0.16))');

      // Icon placeholder: black circle with GH letters
      const iconX = 14;
      const iconY = this.projectCardSize.height / 2;
      pg.append('circle')
        .attr('cx', iconX + 12)
        .attr('cy', iconY)
        .attr('r', 12)
        .attr('fill', '#000000');
      pg.append('text')
        .attr('x', iconX + 12)
        .attr('y', iconY + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .text('GH');

      // Project name
      pg.append('text')
        .attr('x', 44)
        .attr('y', iconY + 5)
        .attr('fill', '#0f172a')
        .attr('font-size', 14)
        .attr('font-weight', 600)
        .text(item.name);
    });

    this.projectsGroup = g;
  }

  private closeProjects() {
    if (this.projectsGroup) {
      this.projectsGroup.remove();
      this.projectsGroup = null;
    }
    this.projectConnectors.forEach((c) => c.remove());
    this.projectConnectors = [];
  }
}
