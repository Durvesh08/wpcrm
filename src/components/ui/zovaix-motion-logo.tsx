'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export type ZovaixMotionMode = 'once' | 'loop' | 'cine' | 'static';

interface ZovaixMotionLogoProps extends React.SVGProps<SVGSVGElement> {
  mode?: ZovaixMotionMode;
  className?: string;
  size?: number | string;
}

const D = {
  t: "M1625.9 915C1627.5 906.1 1629.5 897.2 1630.7 888.2C1631.5 882.4 1632.1 876.6 1632.3 870.8C1632.5 864.7 1632.5 858.5 1632.1 852.4C1631.7 845.2 1630.9 838 1629.6 830.9C1628.5 824.6 1627 818.4 1625.2 812.3C1623.6 806.8 1621.7 801.3 1619.4 796.1C1617.1 790.6 1614.4 785.2 1611.5 780C1608.1 774.2 1604.5 768.5 1600.5 763C1596.9 758 1593.1 753.1 1588.9 748.6C1583.8 743 1578.4 737.7 1572.7 732.8C1566.6 727.5 1560.1 722.6 1553.5 718C1547.5 713.9 1541.3 710.1 1535 706.5C1528.7 703 1522.2 699.8 1515.7 696.8C1508.4 693.6 1501 690.7 1493.4 688.1C1485.6 685.3 1477.6 683 1469.6 680.9C1462.6 679 1455.5 677.4 1448.4 676.1C1436.8 673.9 1425.1 672.3 1413.4 671.1C1401.6 669.9 1389.8 669.1 1378 668.9C1369 668.7 1360 669.5 1351 669.5L345 669.5C340.4 669.5 335.9 669.6 331.3 669.2C328.5 669 325.7 668.4 322.9 668C327.8 662.4 332.6 656.6 337.6 651.1L638.6 321.1C644 315.2 649.8 309.6 655.6 304.1C662.1 297.9 668.8 291.9 675.6 286.1C682.5 280.3 689.5 274.6 696.7 269.2C702.5 264.7 708.5 260.3 714.6 256.1C722.8 250.6 731.2 245.2 739.8 240.3C747.2 236 754.9 231.9 762.6 228.1C768.1 225.5 773.7 223.1 779.3 220.8C787.5 217.5 795.7 214.3 804.1 211.6C811 209.3 818.1 207.4 825.1 205.6C831.9 203.9 838.8 202.5 845.7 201.2C851.4 200.1 857.1 199.2 862.9 198.4C870.8 197.4 878.7 196.7 886.7 196.2C892.1 195.8 897.6 195.5 903 195.5L2180 195.5C2187.4 195.5 2194.9 195.8 2202.3 196C2200.3 198.9 2198.4 202 2196.2 204.7L2123.7 295.2L1660.8 872.3C1649.3 886.7 1637.5 900.8 1625.9 915Z",
  m: "M196.7 1660C198.4 1657.4 200 1654.8 201.9 1652.3C209.8 1641.4 218.7 1631.2 227.2 1620.7L662.9 1079.4C671.4 1068.7 680.6 1058.5 690 1048.5C697.1 1041 704.5 1033.6 712.1 1026.6C718.1 1020.9 724.3 1015.4 730.7 1010.2C739.1 1003.2 747.7 996.5 756.5 990C763.6 984.7 770.8 979.6 778.2 974.7C789.2 967.6 800.4 960.8 811.8 954.3C820.7 949.1 829.7 944.1 838.9 939.4L1327.5 691C1342.6 683.3 1356.4 671.9 1373 668.5C1385.3 666.1 1398.2 669.6 1410.7 670.8C1420.4 671.8 1430 673.1 1439.6 674.9C1445.7 676 1451.7 677.4 1457.6 678.9C1463.7 680.4 1469.7 682 1475.6 683.9C1485.5 687.1 1495.3 690.7 1504.9 694.6C1510.3 696.8 1515.6 699.2 1520.7 701.8C1524.9 703.9 1529 706.2 1533 708.5C1537.4 711.1 1541.7 713.7 1545.9 716.6C1550.9 719.9 1555.7 723.5 1560.4 727.1C1564.1 730 1567.8 733 1571.3 736.2C1575 739.5 1578.5 743 1582 746.5C1584.5 749 1587 751.5 1589.3 754.2C1592.3 757.6 1595.1 761.1 1597.8 764.7C1600.8 768.7 1603.7 772.8 1606.4 777.1C1609.3 781.6 1612 786.3 1614.5 791C1616.2 794.3 1617.9 797.7 1619.4 801.1C1621.1 805.2 1622.6 809.3 1624 813.5C1625.6 818.3 1627 823.3 1628.2 828.3C1629.4 833 1630.3 837.7 1631 842.5C1631.6 846.7 1632.1 851 1632.3 855.2C1632.5 860.1 1632.6 865 1632.3 869.8C1631.9 877.7 1631.1 885.6 1629.9 893.4C1628.9 898.8 1627.7 904.3 1626.1 909.6C1625.3 912.4 1624.5 915.2 1623.2 917.7C1622.2 919.9 1620.7 921.9 1619.3 923.8C1616.6 927.4 1613.6 930.7 1610.4 933.9C1604.2 940.4 1597.6 946.4 1590.7 952.2C1584.4 957.6 1577.6 962.5 1570.9 967.4C1563.1 973 1555.2 978.4 1547.1 983.6C1532.5 993.1 1517.5 1002.1 1502.5 1011C1485.9 1020.8 1469.2 1030.5 1452.3 1039.8L1342.4 1099.9L1131.1 1213.6L341.8 1656.3C339.3 1657.7 336.6 1658.7 333.9 1659.3C330.6 1660.1 327.3 1660.4 323.9 1660.4L196.7 1660Z",
  b: "M336.8 1660C343.8 1655.8 350.7 1651.4 357.9 1647.4L1147 1217.8L2050 1217.5C2057 1217.5 2064 1218.2 2071 1218.6L1852.6 1514.1C1846.1 1522.8 1839.1 1531.3 1832.1 1539.6C1826.7 1546.2 1821.2 1552.7 1815.4 1558.9C1805.6 1569.4 1795.4 1579.6 1784.7 1589.2C1778.8 1594.6 1772.5 1599.7 1766 1604.5C1760.1 1609 1754.1 1613.3 1747.9 1617.4C1742 1621.2 1735.9 1624.8 1729.7 1628.2C1723.6 1631.5 1717.4 1634.7 1711 1637.5C1704.5 1640.5 1697.8 1643.1 1691 1645.4C1684.9 1647.5 1678.7 1649.3 1672.4 1650.9C1665.9 1652.6 1659.4 1654 1652.8 1655.3C1646.7 1656.4 1640.6 1657.3 1634.5 1658C1621.4 1659.4 1608.2 1660.5 1595 1660.5L359 1660.5C351.6 1660.5 344.2 1660.2 336.8 1660Z"
};

const G: Record<string, { p: [number, number, number, number]; s: [number, string][] }> = {
  t: {
    p: [1485, -26, 1105, 916],
    s: [
      [0.0, "#d7fc00"],
      [0.125, "#c8f800"],
      [0.25, "#b6f400"],
      [0.375, "#a3f000"],
      [0.5, "#91ec00"],
      [0.625, "#84e900"],
      [0.75, "#92ec00"],
      [0.875, "#a4f000"],
      [1.0, "#b3f400"]
    ]
  },
  m: {
    p: [1326, 595, 515, 1797],
    s: [
      [0.0, "#085a46"],
      [0.125, "#06735c"],
      [0.25, "#04977b"],
      [0.375, "#01ba9a"],
      [0.5, "#00cfaf"],
      [0.625, "#00dabe"],
      [0.75, "#00e5cd"],
      [0.875, "#00f0db"],
      [1.0, "#00f8e7"]
    ]
  },
  b: {
    p: [1247, 1223, 1367, 1704],
    s: [
      [0.0, "#036d7f"],
      [0.125, "#037889"],
      [0.25, "#028595"],
      [0.375, "#0192a1"],
      [0.5, "#009fad"],
      [0.625, "#00acba"],
      [0.75, "#00bac7"],
      [0.875, "#00c8d5"],
      [1.0, "#00d3df"]
    ]
  }
};

const ST: [number, string][] = [
  [70, '-.2s'],
  [120, '-.7s'],
  [170, '-1.2s']
];

export function ZovaixMotionLogo({
  mode = 'loop',
  className,
  size,
  style,
  ...props
}: ZovaixMotionLogoProps) {
  const rawId = useId();
  // Strip non-alphanumeric characters for clean SVG IDs
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const isStatic = mode === 'static';
  const modeClass = isStatic ? '' : mode;

  return (
    <svg
      className={cn('zx-motion-logo', modeClass, className)}
      viewBox="176 176 2047 1504"
      role="img"
      aria-label="ZOVAIX logo"
      style={{
        width: size ?? '100%',
        height: size ? 'auto' : undefined,
        ...style
      }}
      {...props}
    >
      <defs>
        {/* Top ribbon gradient */}
        <linearGradient
          id={`gt_${id}`}
          gradientUnits="userSpaceOnUse"
          x1={G.t.p[0]}
          y1={G.t.p[1]}
          x2={G.t.p[2]}
          y2={G.t.p[3]}
        >
          {G.t.s.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>

        {/* Middle ribbon gradient */}
        <linearGradient
          id={`gm_${id}`}
          gradientUnits="userSpaceOnUse"
          x1={G.m.p[0]}
          y1={G.m.p[1]}
          x2={G.m.p[2]}
          y2={G.m.p[3]}
        >
          {G.m.s.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>

        {/* Bottom ribbon gradient */}
        <linearGradient
          id={`gb_${id}`}
          gradientUnits="userSpaceOnUse"
          x1={G.b.p[0]}
          y1={G.b.p[1]}
          x2={G.b.p[2]}
          y2={G.b.p[3]}
        >
          {G.b.s.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>

        {/* Sheen gradient for light reflection */}
        <linearGradient id={`sh_${id}`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* Clip paths for ribbons */}
        <clipPath id={`kt_${id}`}>
          <path d={D.t} />
        </clipPath>
        <clipPath id={`km_${id}`}>
          <path d={D.m} />
        </clipPath>
        <clipPath id={`kb_${id}`}>
          <path d={D.b} />
        </clipPath>
      </defs>

      {/* Middle Ribbon (drawn underneath top and bottom) */}
      <g className="rb r2">
        <path className="fl" d={D.m} fill={`url(#gm_${id})`} />
        <path
          className="fl"
          d={D.m}
          fill="none"
          stroke={`url(#gm_${id})`}
          strokeWidth="6"
          clipPath={`url(#kt_${id})`}
        />
        {/* Streak lights (cine mode) */}
        <g className="fx" clipPath={`url(#km_${id})`}>
          <g transform="skewX(-38.7)">
            {ST.map(([w, d], i) => (
              <rect
                key={i}
                className="st"
                style={{ ['--sd' as string]: d }}
                x="0"
                y="180"
                width={w}
                height="1500"
                fill={`url(#sh_${id})`}
              />
            ))}
          </g>
        </g>
        {/* Light sheen */}
        <g clipPath={`url(#km_${id})`}>
          <g transform="skewX(-38.7)">
            <rect className="sh" x="0" y="180" width="300" height="1500" fill={`url(#sh_${id})`} />
          </g>
        </g>
      </g>

      {/* Top Ribbon */}
      <g className="rb r1">
        <path className="fl" d={D.t} fill={`url(#gt_${id})`} />
        <g className="fx" clipPath={`url(#kt_${id})`}>
          <g transform="skewX(-38.7)">
            {ST.map(([w, d], i) => (
              <rect
                key={i}
                className="st"
                style={{ ['--sd' as string]: d }}
                x="0"
                y="180"
                width={w}
                height="1500"
                fill={`url(#sh_${id})`}
              />
            ))}
          </g>
        </g>
        <g clipPath={`url(#kt_${id})`}>
          <g transform="skewX(-38.7)">
            <rect className="sh" x="0" y="180" width="300" height="1500" fill={`url(#sh_${id})`} />
          </g>
        </g>
      </g>

      {/* Bottom Ribbon */}
      <g className="rb r3">
        <path className="fl" d={D.b} fill={`url(#gb_${id})`} />
        <g className="fx" clipPath={`url(#kb_${id})`}>
          <g transform="skewX(-38.7)">
            {ST.map(([w, d], i) => (
              <rect
                key={i}
                className="st"
                style={{ ['--sd' as string]: d }}
                x="0"
                y="180"
                width={w}
                height="1500"
                fill={`url(#sh_${id})`}
              />
            ))}
          </g>
        </g>
        <g clipPath={`url(#kb_${id})`}>
          <g transform="skewX(-38.7)">
            <rect className="sh" x="0" y="180" width="300" height="1500" fill={`url(#sh_${id})`} />
          </g>
        </g>
      </g>

      {/* Cinematic outline glow overlay */}
      <g className="ob">
        <path className="ol r2" pathLength="1" d={D.m} stroke={`url(#gm_${id})`} />
        <path className="ol r1" pathLength="1" d={D.t} stroke={`url(#gt_${id})`} />
        <path className="ol r3" pathLength="1" d={D.b} stroke={`url(#gb_${id})`} />
      </g>
    </svg>
  );
}
