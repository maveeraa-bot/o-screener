export type Language = 'tr' | 'en';

export interface Translations {
  appName: string;
  realDataBadge: string;
  wsLive: string;
  wsReconnecting: string;
  wsTitleConnected: string;
  wsTitleReconnecting: string;
  subtitle: string;
  tabTerminal: string;
  tabStats: string;
  timeframe: string;
  refresh: string;
  refreshNow: string;
  alertSoundOn: string;
  alertSoundMuted: string;
  aiVisualBtn: string;
  popularPairs: string;
  symbolSearchPlaceholder: string;
  
  // Stats Bar
  indexPrice: string;
  liveBinanceFeed: string;
  openInterest: string;
  windowDelta: string;
  relativeOiZ: string;
  stdDev: string;
  relativePriceZ: string;
  activeFlowState: string;
  normalFlow: string;
  downBurst: string;
  upBurst: string;
  confirmedLiq15m: string;
  eventsCount: string;
  longsLiqShort: string;
  shortsLiqShort: string;
  
  // Chart
  chartSubtitle: string;
  chartPrice: string;
  chartOi: string;
  chartRelOi: string;
  chartBarType: string;
  bullishCandle: string;
  bearishCandle: string;
  reversalPoint: string;
  liquidationBurst: string;
  lowerSubpanel: string;
  chartWaiting: string;
  
  // Alert Feed
  feedTitle: string;
  feedSubtitle: string;
  detectedCount: string;
  formulasBtn: string;
  allAlerts: string;
  reversals: string;
  shortsLiqTab: string;
  longsLiqTab: string;
  inflowTab: string;
  searchAlertsPlaceholder: string;
  exportJsonTooltip: string;
  clearAlertsTooltip: string;
  noAlertsTitle: string;
  noAlertsDesc: string;
  
  // Card
  patternLabel: string;
  symbolLabel: string;
  timeframeLabel: string;
  priceLabel: string;
  patternDetailsTitle: string;
  entryPriceLabel: string;
  currentPriceLabel: string;
  priceChangeLabel: string;
  oiAnalysisTitle: string;
  startingOiLabel: string;
  currentOiLabel: string;
  oiChangeLabel: string;
  relativeOiLabel: string;
  relativePriceLabel: string;
  patternInterpretationTitle: string;
  riskManagementTitle: string;
  burstTypeLabel: string;
  confirmedLiqLabel: string;
  signalTypeLabel: string;
  priceIsRising: string;
  priceIsFalling: string;
  oiIsDecreasing: string;
  oiIsIncreasing: string;
  copyAlertTooltip: string;
  copiedTooltip: string;
  aiCardTooltip: string;
  verifiedFooter: string;
  verifiedBadge: string;
  
  // Stats Panel
  statsTitle: string;
  statsSubtitle: string;
  refreshResults: string;
  evaluating: string;
  exportCsv: string;
  totalAlertsCard: string;
  evaluatedSuffix: string;
  overallWinRateCard: string;
  fifteenMinWinRateCard: string;
  firstBarDesc: string;
  oneHourWinRateCard: string;
  mediumTermDesc: string;
  totalLiqCard: string;
  wsLiqDesc: string;
  patternBreakdownTitle: string;
  patternBreakdownSubtitle: string;
  noStatsYet: string;
  colPatternName: string;
  colTotal: string;
  colEvaluated: string;
  colOverallWin: string;
  col15mAccuracy: string;
  col1hAccuracy: string;
  col4hAccuracy: string;
  colAvgMove: string;
  colAvgLiq: string;
  trackingLogTitle: string;
  trackingLogSubtitle: string;
  filterSymbolLabel: string;
  filterPatternLabel: string;
  allSymbolsOption: string;
  allPatternsOption: string;
  clearLogsBtn: string;
  clearLogsConfirm: string;
  noLogsYet: string;
  colDateTime: string;
  colSymbol: string;
  colDirection: string;
  colTriggerPrice: string;
  col15m: string;
  col1h: string;
  col4h: string;
  colActualLiq: string;
  evaluatingStatus: string;
  minsRemaining: string;
  
  // Footer
  footerEngine: string;
  footerZScore: string;
  
  // Formulas Modal
  formulasTitle: string;
  formulasSubtitle: string;
  formulasSection1Title: string;
  formulasSection2Title: string;
  formulasOiChangeDesc: string;
  formulasRelativeOiDesc: string;
  formulasSection3Title: string;
  closeBtn: string;
  
  // Image Gen Modal
  imageGenTitle: string;
  imageGenSubtitle: string;
  promptLabel: string;
  modelLabel: string;
  aspectRatioLabel: string;
  sizeLabel: string;
  generateBtn: string;
  generatingBtn: string;
  downloadBtn: string;
  historyTitle: string;
  noHistoryYet: string;
}

export const translations: Record<Language, Translations> = {
  tr: {
    appName: 'Açık Pozisyon (OI) Radarı',
    realDataBadge: 'GERÇEK VERİ',
    wsLive: 'WS CANLI',
    wsReconnecting: 'WS YENİLENİYOR',
    wsTitleConnected: 'Binance !forceOrder@arr WebSocket Bağlantısı Aktif',
    wsTitleReconnecting: 'Binance WebSocket Yeniden Bağlanıyor',
    subtitle: 'Binance Vadeli İşlemler Canlı Açık Pozisyon & Likidasyon Dedektörü',
    tabTerminal: 'Canlı Terminal',
    tabStats: 'İstatistikler & Doğrulama',
    timeframe: 'Zaman Dilimi',
    refresh: 'Yenileme:',
    refreshNow: 'Şimdi Yenile',
    alertSoundOn: 'Sinyal Sesi AÇIK',
    alertSoundMuted: 'Sessiz',
    aiVisualBtn: 'AI Piyasa Görseli',
    popularPairs: 'Popüler Vadeli Pariteler',
    symbolSearchPlaceholder: 'Örn. BTC, ETH, SOL...',
    
    // Stats Bar
    indexPrice: 'Vadeli Endeks Fiyatı',
    liveBinanceFeed: 'Canlı Binance Akışı',
    openInterest: 'Açık Pozisyon (OI)',
    windowDelta: 'Pencere Değişimi:',
    relativeOiZ: 'Göreceli OI (Z-Skoru)',
    stdDev: 'σ sapma',
    relativePriceZ: 'Göreceli Fiyat:',
    activeFlowState: 'Aktif Akış Durumu',
    normalFlow: 'Olağan OI Akışı',
    downBurst: 'Sert OI Düşüşü (Pozisyon Kapama)',
    upBurst: 'Sert OI Artışı (Yeni Pozisyon Girişi)',
    confirmedLiq15m: 'Teyitli Likidasyon (15dk)',
    eventsCount: 'işlem',
    longsLiqShort: 'Long',
    shortsLiqShort: 'Short',
    
    // Chart
    chartSubtitle: 'Binance Futures Canlı Gerçek Veri',
    chartPrice: 'Fiyat: ',
    chartOi: 'OI: ',
    chartRelOi: 'Gör. OI (z): ',
    chartBarType: 'Bar Tipi: ',
    bullishCandle: 'Yükseliş Mumu (Boğa)',
    bearishCandle: 'Düşüş Mumu (Ayı)',
    reversalPoint: 'Dönüş Noktası',
    liquidationBurst: 'Likidasyon Dalgası',
    lowerSubpanel: 'Alt Panel: Göreceli OI (Z-Skor)',
    chartWaiting: 'Binance Vadeli İşlemler canlı piyasa verisi bekleniyor...',
    
    // Alert Feed
    feedTitle: 'Açık Pozisyon (OI) Sinyal Akışı',
    feedSubtitle: 'Yükseliş/Düşüş Dönüş Formasyonları, Short Sıkışması (S-OUT) ve Long Tasfiyesi (B-OUT) Takibi',
    detectedCount: 'Tespit Edildi',
    formulasBtn: 'Hesaplama Formülleri',
    allAlerts: 'Tüm Sinyaller',
    reversals: 'Dönüş Formasyonları',
    shortsLiqTab: 'Short Likidasyonu (S-OUT)',
    longsLiqTab: 'Long Likidasyonu (B-OUT)',
    inflowTab: 'Agresif Girişler',
    searchAlertsPlaceholder: 'Sinyallerde ara (BTC, S-OUT, Dönüş)...',
    exportJsonTooltip: 'Sinyalleri JSON Olarak İndir',
    clearAlertsTooltip: 'Sinyalleri Temizle',
    noAlertsTitle: 'Mevcut Zaman Penceresinde Aktif Formasyon Sinyali Yok',
    noAlertsDesc: 'Binance Vadeli İşlemler son 48 bar penceresi anlık izleniyor. Piyasa volatilitesi veya Açık Pozisyon hareketleri eşik değerleri (OI değişimi > %0.4, z-skor sapması veya ani likidasyonlar) aştığında sinyal kartları anında burada tetiklenecektir.',
    
    // Card
    patternLabel: 'Formasyon: ',
    symbolLabel: 'Sembol: ',
    timeframeLabel: 'Zaman Dilimi: ',
    priceLabel: 'Fiyat: ',
    patternDetailsTitle: 'Formasyon Detayları:',
    entryPriceLabel: 'Sinyal Seviyesi: ',
    currentPriceLabel: 'Güncel Fiyat: ',
    priceChangeLabel: 'Fiyat Değişimi: ',
    oiAnalysisTitle: 'Açık Pozisyon (OI) Analizi:',
    startingOiLabel: 'Başlangıç OI: ',
    currentOiLabel: 'Güncel OI: ',
    oiChangeLabel: 'OI Değişimi: ',
    relativeOiLabel: 'Göreceli OI (Z-Skor): ',
    relativePriceLabel: 'Göreceli Fiyat (Z-Skor): ',
    patternInterpretationTitle: 'Piyasa Yorumu & Dinamikler:',
    riskManagementTitle: 'Risk Yönetimi & Strateji:',
    burstTypeLabel: 'Akış Tipi:',
    confirmedLiqLabel: 'Teyitli Likidasyonlar:',
    signalTypeLabel: 'Sinyal Yönü:',
    priceIsRising: 'Fiyat Yükseliyor',
    priceIsFalling: 'Fiyat Düşüyor',
    oiIsDecreasing: 'Açık Pozisyon (OI) Azalıyor (Pozisyonlar Kapatılıyor)',
    oiIsIncreasing: 'Açık Pozisyon (OI) Artıyor (Yeni Pozisyonlar Açılıyor)',
    copyAlertTooltip: 'Sinyali kopyala',
    copiedTooltip: 'Kopyalandı!',
    aiCardTooltip: 'AI ile görsel analiz kartı oluştur',
    verifiedFooter: 'Binance Futures Canlı API Verisi',
    verifiedBadge: '%100 Gerçek • %0 Simülasyon',
    
    // Stats Panel
    statsTitle: 'İleriye Dönük Otomatik Doğrulama ve Performans İstatistikleri',
    statsSubtitle: 'Geçmiş varsayımsal tahmin (backtest) yerine, sistemin tetiklediği her alert\'in 15dk, 1sa ve 4sa sonraki gerçek Binance kline kapanış fiyatları ile doğrulanmış başarı analizidir.',
    refreshResults: 'Sonuçları Yenile',
    evaluating: 'Doğrulanıyor...',
    exportCsv: 'CSV İndir',
    totalAlertsCard: 'Toplam Sinyal',
    evaluatedSuffix: 'değerlendirildi',
    overallWinRateCard: 'Genel Başarı Oranı',
    fifteenMinWinRateCard: '15dk Başarı Oranı',
    firstBarDesc: 'Tetiklenme sonrası ilk bar',
    oneHourWinRateCard: '1 Saat Başarı Oranı',
    mediumTermDesc: 'Orta vadeli yön devamı',
    totalLiqCard: 'Teyitli Likidasyon',
    wsLiqDesc: 'WebSocket !forceOrder toplamı',
    patternBreakdownTitle: 'Formasyon Bazında Başarı Dağılımı',
    patternBreakdownSubtitle: 'Her formasyonun doğrulanmış ortalama hareket büyüklüğü ve zaman dilimi isabeti',
    noStatsYet: 'Henüz kaydedilmiş sinyal veya istatistik bulunmuyor.',
    colPatternName: 'Formasyon Adı',
    colTotal: 'Toplam',
    colEvaluated: 'Değerlendirildi',
    colOverallWin: 'Genel Başarı',
    col15mAccuracy: '15dk İsabeti',
    col1hAccuracy: '1sa İsabeti',
    col4hAccuracy: '4sa İsabeti',
    colAvgMove: 'Ort. Hareket',
    colAvgLiq: 'Ort. Likidasyon',
    trackingLogTitle: 'Gerçek İleriye Dönük Sinyal Takip Günlüğü (Forward Tracking Log)',
    trackingLogSubtitle: 'Her alert tetiklenme fiyatı ve +15dk, +1sa, +4sa Binance kline fiyat kontrolleri',
    filterSymbolLabel: 'Sembol:',
    filterPatternLabel: 'Formasyon:',
    allSymbolsOption: 'Tümü',
    allPatternsOption: 'Tüm Formasyonlar',
    clearLogsBtn: 'Sıfırla',
    clearLogsConfirm: 'Emin misiniz? Tıklayın',
    noLogsYet: 'Kayıt bulunamadı. Canlı akışta yeni bir alert tespit edildiğinde otomatik olarak buraya eklenir.',
    colDateTime: 'Tarih / Saat',
    colSymbol: 'Sembol',
    colDirection: 'Yön',
    colTriggerPrice: 'Tetiklenme Fiyatı',
    col15m: '+15 Dakika',
    col1h: '+1 Saat',
    col4h: '+4 Saat',
    colActualLiq: 'Gerçek Likidasyon',
    evaluatingStatus: 'Kontrol ediliyor',
    minsRemaining: 'dk kaldı',
    
    // Footer
    footerEngine: 'Binance Futures Canlı Motoru • %100 Gerçek Borsa Verisi • Sıfır Simülasyon',
    footerZScore: 'Göreceli OI ve Göreceli Fiyat Z-Skorları 48 barlık kayan pencere üzerinden dinamik hesaplanır',
    
    // Formulas Modal
    formulasTitle: 'Sistem Formülleri & Binance API Referansı',
    formulasSubtitle: 'Gerçek Binance Vadeli İşlemler verilerinden matematiksel formül türetimi',
    formulasSection1Title: '1. Gerçek Veri Akışı (Binance Futures REST API)',
    formulasSection2Title: '2. Matematiksel Formüller (Z-Skorları ve Yüzde Değişimleri)',
    formulasOiChangeDesc: 'Önceki bara göre Açık Pozisyon kontrat miktarındaki net oransal değişim.',
    formulasRelativeOiDesc: 'Son 20–48 barlık kayan pencerenin ortalaması ve standart sapması üzerinden normalleştirilmiş sapma. Negatif z-skoru (örn: -1.85, -2.55) olağan dışı hızlı sermaye çıkışını ve pozisyon tasfiyesini gösterir.',
    formulasSection3Title: '3. Formasyon Tanıma ve Likidasyon Motoru',
    closeBtn: 'Kapat',
    
    // Image Gen Modal
    imageGenTitle: 'AI Piyasa Görseli & Paylaşım Kartı',
    imageGenSubtitle: 'Sinyali profesyonel terminal infografiği olarak görselleştirin',
    promptLabel: 'İstem Metni (Prompt):',
    modelLabel: 'Model:',
    aspectRatioLabel: 'En-Boy Oranı:',
    sizeLabel: 'Çözünürlük:',
    generateBtn: 'Görsel Oluştur',
    generatingBtn: 'Görsel Üretiliyor...',
    downloadBtn: 'İndir',
    historyTitle: 'Önceki Üretimler',
    noHistoryYet: 'Henüz üretilmiş görsel yok.',
  },
  en: {
    appName: 'Open Interest Variation',
    realDataBadge: 'REAL DATA',
    wsLive: 'WS LIVE',
    wsReconnecting: 'WS RECONNECTING',
    wsTitleConnected: 'Binance !forceOrder@arr WebSocket Connected',
    wsTitleReconnecting: 'Reconnecting to Binance WebSocket',
    subtitle: 'Binance Futures Alert Detector & Liquidation Engine',
    tabTerminal: 'Live Terminal',
    tabStats: 'Stats & Validation',
    timeframe: 'Timeframe',
    refresh: 'Refresh:',
    refreshNow: 'Refresh Now',
    alertSoundOn: 'Alert Sound ON',
    alertSoundMuted: 'Muted',
    aiVisualBtn: 'AI Market Visualizer',
    popularPairs: 'Popular Pairs',
    symbolSearchPlaceholder: 'e.g. BTC, ETH, SOL...',
    
    // Stats Bar
    indexPrice: 'Futures Index Price',
    liveBinanceFeed: 'Live Binance Feed',
    openInterest: 'Open Interest (OI)',
    windowDelta: 'Window Delta:',
    relativeOiZ: 'Relative OI (z-score)',
    stdDev: 'σ dev',
    relativePriceZ: 'Relative Price:',
    activeFlowState: 'Active Flow State',
    normalFlow: 'Normal OI Flow',
    downBurst: 'Down Burst (Rapid OI Decrease)',
    upBurst: 'Up Burst (Rapid OI Increase)',
    confirmedLiq15m: 'Liq Confirmed (15m)',
    eventsCount: 'ev',
    longsLiqShort: 'L',
    shortsLiqShort: 'S',
    
    // Chart
    chartSubtitle: 'Binance Futures Live Real Data',
    chartPrice: 'Price: ',
    chartOi: 'OI: ',
    chartRelOi: 'Rel OI (z): ',
    chartBarType: 'Bar Type: ',
    bullishCandle: 'Bullish Candle',
    bearishCandle: 'Bearish Candle',
    reversalPoint: 'Reversal Point',
    liquidationBurst: 'Liquidation Burst',
    lowerSubpanel: 'Lower: Rel OI (z-score)',
    chartWaiting: 'Waiting for real Binance Futures market data...',
    
    // Alert Feed
    feedTitle: 'Open Interest Variation Alert Feed',
    feedSubtitle: 'Pattern detection for Bullish/Bearish Reversals, Massive Shorts Liq (S-OUT) & Massive Longs Liq (B-OUT)',
    detectedCount: 'Detected',
    formulasBtn: 'Calculations & Formulas',
    allAlerts: 'All Alerts',
    reversals: 'Reversals',
    shortsLiqTab: 'Shorts Liq (S-OUT)',
    longsLiqTab: 'Longs Liq (B-OUT)',
    inflowTab: 'Aggressive Inflow',
    searchAlertsPlaceholder: 'Filter alerts...',
    exportJsonTooltip: 'Export alerts as JSON',
    clearAlertsTooltip: 'Clear alerts list',
    noAlertsTitle: 'No Active Pattern Alerts in Current Window',
    noAlertsDesc: 'Monitoring the live Binance Futures 48-bar window. As market volatility and Open Interest changes cross threshold levels (OI change > 0.4%, z-scores, liquidations), alerts will instantly trigger here.',
    
    // Card
    patternLabel: 'Pattern: ',
    symbolLabel: 'Symbol: ',
    timeframeLabel: 'Timeframe: ',
    priceLabel: 'Price: ',
    patternDetailsTitle: 'Pattern Details:',
    entryPriceLabel: 'Entry Price: ',
    currentPriceLabel: 'Current Price: ',
    priceChangeLabel: 'Price Change: ',
    oiAnalysisTitle: 'Open Interest Analysis:',
    startingOiLabel: 'Starting OI: ',
    currentOiLabel: 'Current OI: ',
    oiChangeLabel: 'OI Change: ',
    relativeOiLabel: 'Relative OI (z-score): ',
    relativePriceLabel: 'Relative Price (z-score): ',
    patternInterpretationTitle: 'Pattern Interpretation:',
    riskManagementTitle: 'Risk Management:',
    burstTypeLabel: 'Burst Type:',
    confirmedLiqLabel: 'Confirmed Liquidations:',
    signalTypeLabel: 'Signal Type:',
    priceIsRising: 'Price is Rising',
    priceIsFalling: 'Price is Falling',
    oiIsDecreasing: 'OI is Decreasing (Positions Unwinding)',
    oiIsIncreasing: 'OI is Increasing (New Positions Opening)',
    copyAlertTooltip: 'Copy alert text',
    copiedTooltip: 'Copied!',
    aiCardTooltip: 'Generate visual AI trading card',
    verifiedFooter: 'Binance Futures Live API Data',
    verifiedBadge: '100% Real • 0% Sim',
    
    // Stats Panel
    statsTitle: 'Forward Tracking & Forward Validation Performance',
    statsSubtitle: 'Real-time validation measuring actual Binance kline price changes +15m, +1h, and +4h after each alert trigger.',
    refreshResults: 'Refresh Evaluation',
    evaluating: 'Evaluating...',
    exportCsv: 'Export CSV',
    totalAlertsCard: 'Total Tracked',
    evaluatedSuffix: 'evaluated',
    overallWinRateCard: 'Overall Win Rate',
    fifteenMinWinRateCard: '15m Accuracy',
    firstBarDesc: 'First bar after trigger',
    oneHourWinRateCard: '1 Hour Accuracy',
    mediumTermDesc: 'Medium term trend follow',
    totalLiqCard: 'Confirmed Liq',
    wsLiqDesc: 'WebSocket !forceOrder total',
    patternBreakdownTitle: 'Pattern Performance Breakdown',
    patternBreakdownSubtitle: 'Verified average return and timeframe accuracy by detected pattern',
    noStatsYet: 'No alerts or performance statistics logged yet.',
    colPatternName: 'Pattern Name',
    colTotal: 'Total',
    colEvaluated: 'Evaluated',
    colOverallWin: 'Overall Win Rate',
    col15mAccuracy: '15m Accuracy',
    col1hAccuracy: '1h Accuracy',
    col4hAccuracy: '4h Accuracy',
    colAvgMove: 'Avg Return',
    colAvgLiq: 'Avg Liq',
    trackingLogTitle: 'Real Forward Tracking Log',
    trackingLogSubtitle: 'Alert trigger price alongside +15m, +1h, and +4h Binance kline price checks',
    filterSymbolLabel: 'Symbol:',
    filterPatternLabel: 'Pattern:',
    allSymbolsOption: 'All',
    allPatternsOption: 'All Patterns',
    clearLogsBtn: 'Clear',
    clearLogsConfirm: 'Are you sure? Click again',
    noLogsYet: 'No logs yet. Newly detected live alerts will automatically be tracked here.',
    colDateTime: 'Date / Time',
    colSymbol: 'Symbol',
    colDirection: 'Direction',
    colTriggerPrice: 'Trigger Price',
    col15m: '+15 Minutes',
    col1h: '+1 Hour',
    col4h: '+4 Hours',
    colActualLiq: 'Confirmed Liq',
    evaluatingStatus: 'Checking now',
    minsRemaining: 'm left',
    
    // Footer
    footerEngine: 'Binance Futures REST Engine • 100% Real API Data • Zero Mocking',
    footerZScore: 'Relative OI & Relative Price z-scores computed over rolling window',
    
    // Formulas Modal
    formulasTitle: 'System Formulas & Binance API Reference',
    formulasSubtitle: 'Exact mathematical derivation from real Binance Futures data',
    formulasSection1Title: '1. Real Data Ingestion (Binance Futures REST API)',
    formulasSection2Title: '2. Mathematical Formulas (z-scores & Deltas)',
    formulasOiChangeDesc: 'Percentage change in Open Interest contracts compared to previous bar.',
    formulasRelativeOiDesc: 'Normalized standard deviation across rolling 20–48 bars. Negative z-score (e.g. -1.85, -2.55) reflects anomalous rapid capital outflow.',
    formulasSection3Title: '3. Pattern & Liquidation Alert Engine',
    closeBtn: 'Close Documentation',
    
    // Image Gen Modal
    imageGenTitle: 'AI Market Visualizer & Card Generator',
    imageGenSubtitle: 'Turn live Binance alerts into high-res trading terminal graphics',
    promptLabel: 'Prompt Text:',
    modelLabel: 'Model:',
    aspectRatioLabel: 'Aspect Ratio:',
    sizeLabel: 'Resolution:',
    generateBtn: 'Generate Image',
    generatingBtn: 'Generating...',
    downloadBtn: 'Download',
    historyTitle: 'Previous Generations',
    noHistoryYet: 'No images generated yet.',
  },
};
