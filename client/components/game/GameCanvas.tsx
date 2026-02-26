"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics, Text, TextStyle } from "pixi.js";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    appRef.current = app;

    (async () => {
      await app.init({
        background: "#1a1a2e",
        resizeTo: window,
        antialias: true,
      });

      containerRef.current!.appendChild(app.canvas as HTMLCanvasElement);

      // --- Placeholder slime (circle) ---
      const slime = new Graphics();
      const slimeColor = 0x55efc4;
      const slimeX = app.screen.width / 2;
      const slimeY = app.screen.height / 2;
      const slimeRadius = 50;

      // Draw slime body
      slime.circle(0, 0, slimeRadius);
      slime.fill({ color: slimeColor, alpha: 0.8 });
      slime.circle(0, 0, slimeRadius * 0.85);
      slime.fill({ color: 0x7fffd4, alpha: 0.3 });

      // Eyes
      slime.circle(-15, -10, 8);
      slime.fill({ color: 0xffffff });
      slime.circle(15, -10, 8);
      slime.fill({ color: 0xffffff });
      slime.circle(-13, -12, 4);
      slime.fill({ color: 0x2d3436 });
      slime.circle(17, -12, 4);
      slime.fill({ color: 0x2d3436 });

      // Mouth
      slime.moveTo(-8, 8);
      slime.quadraticCurveTo(0, 18, 8, 8);
      slime.stroke({ width: 2, color: 0x2d3436 });

      slime.x = slimeX;
      slime.y = slimeY;
      slime.eventMode = "static";
      slime.cursor = "pointer";

      app.stage.addChild(slime);

      // --- Idle bounce animation ---
      let time = 0;
      let bouncing = false;
      let bounceTime = 0;

      app.ticker.add((ticker) => {
        time += ticker.deltaTime * 0.05;

        // Idle floating
        const idleY = Math.sin(time) * 5;
        const idleScaleX = 1 + Math.sin(time * 1.5) * 0.02;
        const idleScaleY = 1 - Math.sin(time * 1.5) * 0.02;

        if (bouncing) {
          bounceTime += ticker.deltaTime * 0.15;
          const bounceY = -Math.abs(Math.sin(bounceTime * Math.PI)) * 80;
          const squash = 1 + Math.sin(bounceTime * Math.PI) * 0.15;

          slime.y = slimeY + bounceY + idleY;
          slime.scale.x = idleScaleX / squash;
          slime.scale.y = idleScaleY * squash;

          if (bounceTime >= 3) {
            bouncing = false;
            bounceTime = 0;
          }
        } else {
          slime.y = slimeY + idleY;
          slime.scale.x = idleScaleX;
          slime.scale.y = idleScaleY;
        }
      });

      // Click to bounce
      slime.on("pointerdown", () => {
        bouncing = true;
        bounceTime = 0;
      });

      // --- Title text ---
      const titleStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 28,
        fontWeight: "bold",
        fill: "#55EFC4",
        dropShadow: {
          color: "#000000",
          blur: 4,
          distance: 2,
        },
      });

      const title = new Text({ text: "SlimeTopia", style: titleStyle });
      title.anchor.set(0.5);
      title.x = app.screen.width / 2;
      title.y = 60;
      app.stage.addChild(title);

      // --- Subtitle ---
      const subStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fill: "#B2BEC3",
      });

      const subtitle = new Text({
        text: "슬라임을 클릭해보세요!",
        style: subStyle,
      });
      subtitle.anchor.set(0.5);
      subtitle.x = app.screen.width / 2;
      subtitle.y = app.screen.height / 2 + 90;
      app.stage.addChild(subtitle);
    })();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} id="game-canvas" />;
}
