"use client";

import React, { useCallback, useMemo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; // or loadFull for more features
// import { loadFull } from "tsparticles"; // if you need all features

// This should be called only once per page load
// initParticlesEngine(async (engine) => {
//   await loadSlim(engine);
//   // await loadFull(engine); // if using loadFull
// });

interface ParticlesBackgroundProps {
  currentTheme: string; // To change particle colors with theme
}

const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ currentTheme }) => {
  const [init, setInit] = React.useState(false);

  React.useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      // await loadFull(engine); // if using loadFull
    }).then(() => {
      setInit(true);
    });
  }, []);


  const particleColors = useMemo(() => {
    switch (currentTheme) {
      case 'theme-cyber':
        return ["#00ff9c", "#ff00e0", "#00b3ff"];
      case 'theme-neon':
        return ["#ffff00", "#ff00e6", "#00ffd2"];
      case 'theme-dark':
        return ["#90baf9", "#6effd5", "#fafafa"];
      case 'theme-og':
      default:
        return ["#007bff", "#6c757d", "#28a745", "#ffc107"];
    }
  }, [currentTheme]);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent", // Handled by body background
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: "push",
          },
          onHover: {
            enable: true,
            mode: "repulse",
          },
        },
        modes: {
          push: {
            quantity: 2,
          },
          repulse: {
            distance: 100,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: particleColors,
        },
        links: {
          color: particleColors[0] || "#ffffff", // Use first color or default
          distance: 150,
          enable: false, // OG particles didn't have links
          opacity: 0.3,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: {
            default: "out",
          },
          random: true,
          speed: 1,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 800, // value_area in OG
          },
          value: 80, // OG had 150, adjust for performance
        },
        opacity: {
          value: {min: 0.1, max: 0.5},
           animation: {
             enable: true,
             speed: 0.5,
             minimumValue: 0.1,
             sync: false,
           },
        },
        shape: {
          type: "circle",
        },
        size: {
          value: { min: 1, max: 3 },
          animation: {
            enable: true,
            speed: 2,
            minimumValue: 0.1,
            sync: false,
          },
        },
      },
      detectRetina: true,
    }),
    [particleColors]
  );

  if (!init) {
    return null;
  }

  return <Particles id="tsparticles" options={options as any} />;
};

export default ParticlesBackground;