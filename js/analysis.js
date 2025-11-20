// Analysis Engine - Phân tích thị trường tự động
const AnalysisEngine = {
    isRunning: false,
    currentCycle: 0,
    nextScanTime: null,
    scanInterval: null,
    trackInterval: null,
    
    // Top 10 coins được yêu thích nhất
    topCoins: [
        'BTCUSDT',
        'ETHUSDT',
        'BNBUSDT',
        'SOLUSDT',
        'XRPUSDT',
        'ADAUSDT',
        'DOGEUSDT',
        'AVAXUSDT',
        'LINKUSDT',
        'MATICUSDT'
    ],
    
    // Binance API endpoints
    API: {
        klines: (symbol, interval, limit = 500) => 
            `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        
        price: (symbol) => 
            `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`,
        
        ticker24h: (symbol) => 
            `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`
    },
    
    // Timeframes cho phân tích
    timeframes: [
        { label: 'D1', interval: '1d', weight: 1.5 },
        { label: 'H4', interval: '4h', weight: 1.3 },
        { label: 'H1', interval: '1h', weight: 1.1 },
        { label: 'M15', interval: '15m', weight: 0.9 }
    ],
    
    // Khởi động engine
    start() {
        if (this.isRunning) {
            console.log('Analysis engine already running');
            return;
        }
        
        console.log('Starting Analysis Engine...');
        this.isRunning = true;
        
        // Tính thời gian scan tiếp theo
        this.calculateNextScanTime();
        
        // Bắt đầu quét theo chu kỳ 15 phút
        this.startScanCycle();
        
        // Bắt đầu theo dõi các coin đang tracked
        this.startTrackingCycle();
        
        // Kiểm tra tạo summary hàng ngày
        this.checkDailySummary();
        
        this.updateStatus();
    },
    
    // Dừng engine
    stop() {
        console.log('Stopping Analysis Engine...');
        this.isRunning = false;
        
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        if (this.trackInterval) {
            clearInterval(this.trackInterval);
            this.trackInterval = null;
        }
        
        this.updateStatus();
    },
    
    // Tính thời gian scan tiếp theo (mỗi 15 phút: xx:01, xx:16, xx:31, xx:46)
    calculateNextScanTime() {
        const now = new Date();
        const minutes = now.getMinutes();
        
        // Tìm phút tiếp theo trong chu kỳ
        const scanMinutes = [1, 16, 31, 46];
        let nextMinute = scanMinutes.find(m => m > minutes);
        
        if (!nextMinute) {
            // Nếu đã qua 46 phút, scan ở phút 1 của giờ tiếp theo
            nextMinute = 1;
            now.setHours(now.getHours() + 1);
        }
        
        now.setMinutes(nextMinute);
        now.setSeconds(0);
        now.setMilliseconds(0);
        
        this.nextScanTime = now;
        return now;
    },
    
    // Bắt đầu chu kỳ quét
    startScanCycle() {
        // Kiểm tra mỗi 30 giây xem đã đến giờ scan chưa
        this.scanInterval = setInterval(async () => {
            const now = new Date();
            const currentHour = now.getHours();
            
            // Chỉ quét từ 5h sáng đến 21h31 tối
            if (currentHour < 5 || currentHour > 21 || (currentHour === 21 && now.getMinutes() > 31)) {
                console.log('Outside scanning hours (5:00 AM - 9:31 PM)');
                return;
            }
            
            if (this.nextScanTime && now >= this.nextScanTime) {
                console.log('Starting scan cycle...');
                await this.scanAllCoins();
                this.calculateNextScanTime();
                this.updateStatus();
            }
        }, 30000); // Kiểm tra mỗi 30 giây
    },
    
    // Quét tất cả coins
    async scanAllCoins() {
        console.log(`Scanning ${this.topCoins.length} coins...`);
        
        for (const coin of this.topCoins) {
            try {
                // Kiểm tra coin có trong cooldown không
                const inCooldown = await StorageManager.isInCooldown(coin);
                if (inCooldown) {
                    console.log(`${coin} is in cooldown, skipping...`);
                    continue;
                }
                
                // Phân tích coin
                console.log(`Analyzing ${coin}...`);
                const analysis = await this.analyzeCoin(coin);
                
                // Nếu confidence = 100%, tạo tín hiệu
                if (analysis && analysis.confidence >= 100) {
                    console.log(`🎯 ${coin} has 100% confidence! Creating signal...`);
                    await this.createSignalFromAnalysis(coin, analysis);
                    
                    // Thêm coin vào cooldown 2 tiếng
                    await StorageManager.addCooldownCoin(coin);
                }
                
                // Delay nhỏ giữa các lần phân tích
                await this.delay(2000);
                
            } catch (error) {
                console.error(`Error analyzing ${coin}:`, error);
            }
        }
        
        console.log('Scan cycle completed');
    },
    
    // Phân tích một coin
    async analyzeCoin(symbol) {
        try {
            const results = {
                symbol: symbol,
                timeframes: {},
                confidence: 0,
                direction: null
            };
            
            // Phân tích từng timeframe
            for (const tf of this.timeframes) {
                const candles = await this.loadCandles(symbol, tf.interval, 300);
                if (!candles || candles.length < 100) {
                    console.log(`Not enough data for ${symbol} ${tf.label}`);
                    continue;
                }
                
                results.timeframes[tf.label] = this.analyzeTimeframe(candles, tf);
            }
            
            // Tính confidence tổng hợp
            const analysis = this.calculateOverallConfidence(results);
            
            return analysis;
            
        } catch (error) {
            console.error(`Analysis error for ${symbol}:`, error);
            return null;
        }
    },
    
    // Load dữ liệu nến từ Binance
    async loadCandles(symbol, interval, limit = 500) {
        try {
            const response = await fetch(this.API.klines(symbol, interval, limit));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            return data.map(candle => ({
                time: candle[0],
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        } catch (error) {
            console.error(`Failed to load candles for ${symbol} ${interval}:`, error);
            return null;
        }
    },
    
    // Phân tích một timeframe
    analyzeTimeframe(candles, timeframe) {
        const price = candles[candles.length - 1].close;
        
        // Tính EMA
        const ema20 = this.calculateEMA(candles, 20);
        const ema50 = this.calculateEMA(candles, 50);
        const ema200 = this.calculateEMA(candles, 200);
        
        // Tính RSI
        const rsi = this.calculateRSI(candles, 14);
        
        // Phân tích trend
        const trend = this.analyzeTrend(candles, ema20, ema50, ema200);
        
        // Phân tích volume
        const volumeAnalysis = this.analyzeVolume(candles);
        
        // Tìm support và resistance
        const levels = this.findKeyLevels(candles);
        
        // Tính điểm confidence cho timeframe này
        const score = this.calculateTimeframeScore({
            trend,
            rsi,
            volumeAnalysis,
            levels,
            price,
            ema20,
            ema50,
            ema200
        });
        
        return {
            trend: trend.direction,
            strength: trend.strength,
            rsi: rsi,
            volume: volumeAnalysis,
            levels: levels,
            score: score,
            weight: timeframe.weight,
            ema: { ema20, ema50, ema200 }
        };
    },
    
    // Tính EMA
    calculateEMA(candles, period) {
        if (candles.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
        
        for (let i = period; i < candles.length; i++) {
            ema = (candles[i].close - ema) * multiplier + ema;
        }
        
        return ema;
    },
    
    // Tính RSI
    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = candles.length - period; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return rsi;
    },
    
    // Phân tích trend
    analyzeTrend(candles, ema20, ema50, ema200) {
        const price = candles[candles.length - 1].close;
        
        // Xác định hướng trend
        let direction = 'neutral';
        let strength = 0;
        
        if (ema20 && ema50 && ema200) {
            if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
                direction = 'bullish';
                strength = 0.9;
            } else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
                direction = 'bearish';
                strength = 0.9;
            } else if (price > ema50) {
                direction = 'bullish';
                strength = 0.6;
            } else if (price < ema50) {
                direction = 'bearish';
                strength = 0.6;
            }
        }
        
        return { direction, strength };
    },
    
    // Phân tích volume
    analyzeVolume(candles) {
        const recentVolumes = candles.slice(-20).map(c => c.volume);
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        const currentVolume = candles[candles.length - 1].volume;
        
        const ratio = currentVolume / avgVolume;
        const trend = ratio > 1.2 ? 'increasing' : ratio < 0.8 ? 'decreasing' : 'normal';
        
        return {
            current: currentVolume,
            average: avgVolume,
            ratio: ratio,
            trend: trend
        };
    },
    
    // Tìm support và resistance
    findKeyLevels(candles) {
        const recent = candles.slice(-50);
        
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);
        
        const resistance = Math.max(...highs);
        const support = Math.min(...lows);
        
        return { support, resistance };
    },
    
    // Tính điểm confidence cho timeframe
    calculateTimeframeScore(data) {
        let score = 0;
        
        // Điểm từ trend (40 điểm)
        if (data.trend.direction !== 'neutral') {
            score += 40 * data.trend.strength;
        }
        
        // Điểm từ RSI (30 điểm)
        if (data.trend.direction === 'bullish' && data.rsi < 70 && data.rsi > 40) {
            score += 30;
        } else if (data.trend.direction === 'bearish' && data.rsi > 30 && data.rsi < 60) {
            score += 30;
        }
        
        // Điểm từ volume (30 điểm)
        if (data.volume.trend === 'increasing') {
            score += 30;
        } else if (data.volume.trend === 'normal') {
            score += 15;
        }
        
        return Math.min(100, score);
    },
    
    // Tính confidence tổng hợp từ tất cả timeframes
    calculateOverallConfidence(results) {
        const timeframeData = Object.values(results.timeframes);
        
        if (timeframeData.length === 0) {
            return { ...results, confidence: 0 };
        }
        
        // Tính weighted confidence
        let totalWeight = 0;
        let weightedScore = 0;
        
        const bullishCount = timeframeData.filter(tf => tf.trend === 'bullish').length;
        const bearishCount = timeframeData.filter(tf => tf.trend === 'bearish').length;
        
        timeframeData.forEach(tf => {
            weightedScore += tf.score * tf.weight;
            totalWeight += tf.weight;
        });
        
        const avgConfidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
        
        // Xác định hướng
        let direction = null;
        if (bullishCount > bearishCount && bullishCount >= 3) {
            direction = 'LONG';
        } else if (bearishCount > bullishCount && bearishCount >= 3) {
            direction = 'SHORT';
        }
        
        // Chỉ đạt 100% khi có hướng rõ ràng và confidence cao
        const finalConfidence = direction && avgConfidence >= 85 ? 100 : Math.floor(avgConfidence);
        
        return {
            ...results,
            confidence: finalConfidence,
            direction: direction
        };
    },
    
    // Tạo tín hiệu từ kết quả phân tích
    async createSignalFromAnalysis(symbol, analysis) {
        try {
            // Lấy giá hiện tại
            const priceData = await fetch(this.API.price(symbol)).then(r => r.json());
            const currentPrice = parseFloat(priceData.price);
            
            // Tính entry, TP, SL
            const levels = this.calculateTradingLevels(currentPrice, analysis.direction);
            
            // Tạo signal
            const signal = await StorageManager.addSignal({
                coin: symbol,
                direction: analysis.direction,
                entry: levels.entry,
                tp: levels.tp,
                sl: levels.sl,
                reason: `AI Analysis - Confidence 100% | Multi-TF Confluence`,
                createdBy: 'AI'
            });
            
            console.log(`✅ Signal created for ${symbol}:`, signal);
            
            // Thêm vào danh sách theo dõi
            await StorageManager.addTrackedCoin(signal.id, symbol);
            
            // Cập nhật UI nếu đang ở trang tín hiệu
            if (window.SignalManager) {
                SignalManager.refreshSignals();
            }
            
            return signal;
            
        } catch (error) {
            console.error('Error creating signal:', error);
            return null;
        }
    },
    
    // Tính entry, TP, SL
    calculateTradingLevels(price, direction) {
        if (direction === 'LONG') {
            return {
                entry: (price * 0.998).toFixed(4),
                tp: (price * 1.02).toFixed(4),
                sl: (price * 0.985).toFixed(4)
            };
        } else {
            return {
                entry: (price * 1.002).toFixed(4),
                tp: (price * 0.98).toFixed(4),
                sl: (price * 1.015).toFixed(4)
            };
        }
    },
    
    // Bắt đầu theo dõi các coin đang tracked
    startTrackingCycle() {
        // Kiểm tra mỗi 5 phút
        this.trackInterval = setInterval(async () => {
            await this.checkTrackedCoins();
        }, 5 * 60 * 1000); // 5 phút
        
        // Chạy ngay lần đầu
        setTimeout(() => this.checkTrackedCoins(), 10000);
    },
    
    // Kiểm tra các coin đang tracked
    async checkTrackedCoins() {
        const tracked = await StorageManager.getTrackedCoins() || [];
        
        console.log(`Checking ${tracked.length} tracked coins...`);
        
        for (const item of tracked) {
            try {
                const signal = (await StorageManager.getActiveSignals() || [])
                    .find(s => s.id === item.signalId);
                
                if (!signal) {
                    // Signal không còn active, xóa khỏi tracked
                    await StorageManager.removeTrackedCoin(item.signalId);
                    continue;
                }
                
                // Lấy giá hiện tại
                const priceData = await fetch(this.API.price(signal.coin)).then(r => r.json());
                const currentPrice = parseFloat(priceData.price);
                
                // Kiểm tra xem đã hit entry chưa
                if (!signal.hitEntry) {
                    const hitEntry = signal.direction === 'LONG' 
                        ? currentPrice <= signal.entry 
                        : currentPrice >= signal.entry;
                    
                    if (hitEntry) {
                        await StorageManager.updateSignal(signal.id, { 
                            hitEntry: true,
                            status: 'active'
                        });
                        console.log(`✅ ${signal.coin} hit entry at ${currentPrice}`);
                    }
                }
                
                // Kiểm tra TP/SL (chỉ khi đã hit entry)
                if (signal.hitEntry) {
                    const hitTP = signal.direction === 'LONG' 
                        ? currentPrice >= signal.tp 
                        : currentPrice <= signal.tp;
                    
                    const hitSL = signal.direction === 'LONG' 
                        ? currentPrice <= signal.sl 
                        : currentPrice >= signal.sl;
                    
                    if (hitTP) {
                        // Hit TP - Thắng
                        const profit = StorageManager.calculateProfit(signal.entry, signal.tp, signal.direction);
                        await StorageManager.moveSignalToCompleted(signal.id, {
                            status: 'win',
                            exitPrice: signal.tp,
                            profit: parseFloat(profit)
                        });
                        await StorageManager.removeTrackedCoin(item.signalId);
                        console.log(`🎯 ${signal.coin} hit TP! Profit: ${profit}%`);
                    } else if (hitSL) {
                        // Hit SL - Thua
                        const profit = StorageManager.calculateProfit(signal.entry, signal.sl, signal.direction);
                        await StorageManager.moveSignalToCompleted(signal.id, {
                            status: 'lose',
                            exitPrice: signal.sl,
                            profit: parseFloat(profit)
                        });
                        await StorageManager.removeTrackedCoin(item.signalId);
                        console.log(`❌ ${signal.coin} hit SL! Loss: ${profit}%`);
                    }
                }
                
                // Cập nhật thời gian check
                await StorageManager.updateTrackedCoinCheck(item.signalId);
                
                // Delay nhỏ
                await this.delay(1000);
                
            } catch (error) {
                console.error(`Error checking ${item.coin}:`, error);
            }
        }
        
        // Cập nhật UI
        if (window.SignalManager) {
            SignalManager.refreshSignals();
        }
    },
    
    // Kiểm tra và tạo summary hàng ngày
    checkDailySummary() {
        setInterval(async () => {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            
            // Tạo summary lúc 23:00
            if (hour === 23 && minute === 0) {
                console.log('Generating daily summary...');
                await StorageManager.generateDailySummary();
            }
        }, 60000); // Kiểm tra mỗi phút
    },
    
    // Cập nhật trạng thái
    updateStatus() {
        const statusEl = document.querySelector('.status-text');
        if (!statusEl) return;
        
        if (this.isRunning) {
            statusEl.textContent = 'Đang quét thị trường...';
            statusEl.parentElement.querySelector('.status-dot').classList.add('active');
        } else {
            statusEl.textContent = 'Đã dừng';
            statusEl.parentElement.querySelector('.status-dot').classList.remove('active');
        }
    },
    
    // Delay helper
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Export
if (typeof window !== 'undefined') {
    window.AnalysisEngine = AnalysisEngine;
}
