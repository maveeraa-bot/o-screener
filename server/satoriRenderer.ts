import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

function formatOiK(oi: number, assetSymbol?: string): string {
  let numStr = '';
  if (oi >= 1_000_000_000) {
    numStr = (oi / 1_000_000_000).toFixed(2) + 'B';
  } else if (oi >= 1_000_000) {
    numStr = (oi / 1_000_000).toFixed(2) + 'M';
  } else if (oi >= 1_000) {
    numStr = (oi / 1_000).toFixed(2) + 'K';
  } else {
    numStr = oi.toFixed(2);
  }
  return assetSymbol ? `${numStr} ${assetSymbol}` : numStr;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return '$' + price.toFixed(4);
  }
  return '$' + price.toFixed(6);
}

function formatPercent(pct: number, includePlus: boolean = true): string {
  const prefix = includePlus && pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(2)}%`;
}

function formatZScore(val: number): string {
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}`;
}

function formatNotional(val: number): string {
  if (!val || val <= 0) return '$0.00';
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}K`;
  }
  return `$${val.toFixed(2)}`;
}

let cachedFonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;

function getFonts() {
  if (cachedFonts) return cachedFonts;

  const regularPath = path.join(process.cwd(), 'public', 'assets', 'fonts', 'Roboto-Regular.ttf');
  const boldPath = path.join(process.cwd(), 'public', 'assets', 'fonts', 'Roboto-Bold.ttf');

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(`Font files not found at ${regularPath} or ${boldPath}`);
  }

  cachedFonts = [
    {
      name: 'Roboto',
      data: fs.readFileSync(regularPath),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Roboto',
      data: fs.readFileSync(boldPath),
      weight: 700,
      style: 'normal',
    },
  ];

  return cachedFonts;
}

/**
 * Renders an AlertCardData object into a standalone, high-contrast, crystal-clear PNG buffer
 * using Satori (SVG generation) + Resvg (Rust-backed PNG rasterizer).
 *
 * 100% self-contained in Node.js runtime with zero external browser/Chromium dependencies.
 */
export async function renderAlertCardWithSatori(alert: any): Promise<Buffer> {
  const fonts = getFonts();

  const isReversal = alert.kind === 'BULLISH_REVERSAL' || alert.kind === 'BEARISH_REVERSAL';
  const isBullish = Boolean(alert.isBullish);

  const signalColor = isBullish ? '#059669' : '#e11d48';
  const signalBg = isBullish ? '#ecfdf5' : '#fff1f2';
  const signalBorder = isBullish ? '#a7f3d0' : '#fecdd3';

  const priceColor = (alert.priceChangePct || 0) >= 0 ? '#16a34a' : '#dc2626';
  const oiColor = (alert.oiChangePct || 0) >= 0 ? '#16a34a' : '#dc2626';

  const liqEvents = alert.confirmedLiquidations?.events || alert.confirmedLiquidations?.count || 0;
  const liqNotional = Number(alert.confirmedLiquidations?.notional || alert.confirmedLiquidations?.totalNotional || 0);
  const liqString = `${liqEvents} işlem, ${formatNotional(liqNotional)} hacim`;

  const impactScore = typeof alert.impactScore === 'number' ? alert.impactScore.toFixed(2) : 'N/A';
  const currentPriceFormatted = formatPrice(alert.currentPrice || 0);
  const entryPriceFormatted = alert.entryPrice ? formatPrice(alert.entryPrice) : null;
  const currentOiFormatted = formatOiK(alert.currentOi || 0, alert.baseAsset);
  const startingOiFormatted = alert.startingOi ? formatOiK(alert.startingOi, alert.baseAsset) : null;

  // Build the VDOM tree for Satori
  const vdom: any = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: '#030712',
        padding: '24px',
        fontFamily: 'Roboto',
        boxSizing: 'border-box',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            },
            children: [
              // 1. Top Header Action Bar
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px',
                    marginBottom: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', alignItems: 'center' },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                width: '10px',
                                height: '10px',
                                borderRadius: '5px',
                                backgroundColor: '#10b981',
                                marginRight: '8px',
                              },
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                color: '#047857',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                letterSpacing: '1px',
                                marginRight: '12px',
                              },
                              children: alert.headerTag || 'AÇIK POZİSYON DEĞİŞİMİ',
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fcd34d',
                                color: '#78350f',
                                fontSize: '11px',
                                fontWeight: 'bold',
                              },
                              children: `⚡ Impact: ${impactScore}`,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: 'bold',
                        },
                        children: alert.timeString || '',
                      },
                    },
                  ],
                },
              },

              // 2. Alert Title
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#020617',
                    marginBottom: '12px',
                  },
                  children: alert.title || 'ALARM',
                },
              },

              // 3. Symbol & Timeframe & Pattern Name
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '14px',
                    fontSize: '14px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', alignItems: 'center' },
                        children: [
                          {
                            type: 'span',
                            props: { style: { color: '#64748b', marginRight: '6px' }, children: 'Sembol:' },
                          },
                          {
                            type: 'span',
                            props: {
                              style: {
                                color: '#2563eb',
                                fontWeight: 'bold',
                                fontSize: '16px',
                              },
                              children: alert.symbol || '',
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', alignItems: 'center' },
                        children: [
                          {
                            type: 'span',
                            props: { style: { color: '#64748b', marginRight: '6px' }, children: 'Periyot:' },
                          },
                          {
                            type: 'span',
                            props: {
                              style: {
                                color: '#0f172a',
                                fontWeight: 'bold',
                              },
                              children: alert.timeframe || '',
                            },
                          },
                        ],
                      },
                    },
                    alert.patternName
                      ? {
                          type: 'div',
                          props: {
                            style: { display: 'flex', alignItems: 'center' },
                            children: [
                              {
                                type: 'span',
                                props: { style: { color: '#64748b', marginRight: '6px' }, children: 'Formasyon:' },
                              },
                              {
                                type: 'span',
                                props: {
                                  style: {
                                    color: '#0f172a',
                                    fontWeight: 'bold',
                                  },
                                  children: alert.patternName,
                                },
                              },
                            ],
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },

              // 4. Key Metrics Grid
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '14px',
                  },
                  children: [
                    // Price Row
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', flexDirection: 'column' },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '11px', color: '#64748b' },
                                    children: isReversal ? 'Giriş / Mevcut Fiyat' : 'Mevcut Fiyat',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '15px', fontWeight: 'bold', color: '#0f172a' },
                                    children: isReversal && entryPriceFormatted
                                      ? `${entryPriceFormatted} → ${currentPriceFormatted}`
                                      : currentPriceFormatted,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
                              children: [
                                {
                                  type: 'span',
                                  props: { style: { fontSize: '11px', color: '#64748b' }, children: 'Fiyat Değişimi' },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '15px', fontWeight: 'bold', color: priceColor },
                                    children: formatPercent(alert.priceChangePct || 0),
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // OI Row
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderTop: '1px solid #edf2f7',
                          paddingTop: '8px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', flexDirection: 'column' },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '11px', color: '#64748b' },
                                    children: isReversal ? 'Başlangıç / Mevcut OI' : 'Açık Pozisyon (OI)',
                                  },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '15px', fontWeight: 'bold', color: '#0f172a' },
                                    children: isReversal && startingOiFormatted
                                      ? `${startingOiFormatted} → ${currentOiFormatted}`
                                      : currentOiFormatted,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
                              children: [
                                {
                                  type: 'span',
                                  props: { style: { fontSize: '11px', color: '#64748b' }, children: 'OI Değişimi' },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '15px', fontWeight: 'bold', color: oiColor },
                                    children: formatPercent(alert.oiChangePct || 0),
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },

                    // Z-Scores & Statistical Deviation Row
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          borderTop: '1px solid #edf2f7',
                          paddingTop: '8px',
                          marginTop: '8px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', alignItems: 'center' },
                              children: [
                                {
                                  type: 'span',
                                  props: { style: { fontSize: '12px', color: '#64748b', marginRight: '6px' }, children: 'Göreceli OI (Z):' },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '13px', fontWeight: 'bold', color: '#0f172a' },
                                    children: `${formatZScore(alert.relativeOi || 0)}σ`,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: { display: 'flex', alignItems: 'center' },
                              children: [
                                {
                                  type: 'span',
                                  props: { style: { fontSize: '12px', color: '#64748b', marginRight: '6px' }, children: 'Göreceli Fiyat (Z):' },
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: { fontSize: '13px', fontWeight: 'bold', color: '#0f172a' },
                                    children: `${formatZScore(alert.relativePrice || 0)}σ`,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },

              // 5. Confirmed Liquidations Bar
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#fffbeb',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    border: '1px solid #fef3c7',
                    marginBottom: '14px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: { fontSize: '13px', fontWeight: 'bold', color: '#92400e' },
                        children: '🔥 Teyitli Likidasyonlar:',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: { fontSize: '13px', fontWeight: 'bold', color: '#78350f' },
                        children: liqString,
                      },
                    },
                  ],
                },
              },

              // 6. Burst Type & Signal Direction Badge
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column' },
                        children: [
                          {
                            type: 'span',
                            props: { style: { fontSize: '11px', color: '#64748b' }, children: 'Patlama / Dinamik:' },
                          },
                          {
                            type: 'span',
                            props: {
                              style: { fontSize: '13px', fontWeight: 'bold', color: '#1e293b' },
                              children: alert.burstType || 'Normal OI Akışı',
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: signalBg,
                          border: `1px solid ${signalBorder}`,
                          color: signalColor,
                          fontWeight: 'bold',
                          fontSize: '13px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                width: '8px',
                                height: '8px',
                                borderRadius: '4px',
                                backgroundColor: signalColor,
                                marginRight: '6px',
                              },
                            },
                          },
                          alert.signalType || (isBullish ? 'Yükseliş Sinyali' : 'Düşüş Sinyali'),
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(vdom, {
    width: 640,
    height: 520,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 640 },
  });

  const pngBuffer = resvg.render().asPng();
  return Buffer.from(pngBuffer);
}
