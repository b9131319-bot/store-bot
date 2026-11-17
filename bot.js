const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(bodyParser.json());

const TOKEN = '8455445401:AAFt_f55qgdRLJvrZ5KfEjX3IXVsjaDnxFs';
const OWNER_CHAT_ID = '8266396167'; 
const OWNER_USERNAME = 'abod097644'; 
const EMPLOYEE_USERNAME = 'FFEKN'; 

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const BOT_USERNAME = 'th_s777'; 

const DB_FILE = path.join(__dirname, 'database.json');
const startTime = Date.now();

let securityState = {
    isLocked: false,
    lockReason: null,
    lockTime: null
};

let db = {
    users: {},
    admins: {
        [OWNER_CHAT_ID]: { role: 'owner', name: `المالك الرئيسي (@${OWNER_USERNAME})`, addedBy: 'System' }
    },
    giftCodes: {},
    pointCoupons: {},
    publisherAds: [],
    auditLogs: [],
    errorLogs: [],
    systemSettings: {
        botStatus: 'يعمل 🟢',
        maintenanceMode: false
    },
    services: {
        'pay_tk_f1': { name: '✨ متابعين تيك توك VIP', price: 5000, category: 'paid', min: 100, max: 10000 },
        'pay_tk_v1': { name: '🔥 مشاهدات وتفاعلات تيك توك', price: 3500, category: 'paid', min: 100, max: 10000 },
        'pay_yt_f1': { name: '📺 مشتركين يوتيوب حقيقي', price: 6000, category: 'paid', min: 100, max: 5000 },
        'pay_yt_v1': { name: '📺 مشاهدات يوتيوب سريعة', price: 4500, category: 'paid', min: 100, max: 10000 },
        'pay_in_f1': { name: '📸 متابعين انستقرام تفاعل عالي', price: 5500, category: 'paid', min: 100, max: 5000 },
        'pay_in_v1': { name: '📸 مشاهدات انستقرام', price: 3800, category: 'paid', min: 100, max: 10000 },
        'pay_tw_f1': { name: '💜 متابعين تويتش نشطين', price: 5000, category: 'paid', min: 100, max: 2000 },
        'pay_tw_v1': { name: '💜 مشاهدات بث تويتش', price: 7000, category: 'paid', min: 100, max: 500 },
        'pay_tg_f1': { name: '✈️ متابعين وقنوات تيليجرام', price: 5000, category: 'paid', min: 100, max: 10000 },
        'pay_tg_v1': { name: '✈️ مشاهدات منشورات تيليجرام', price: 3500, category: 'paid', min: 100, max: 10000 },
        'pay_x_f1': { name: '✖️ متابعين منصة X الملكي', price: 5800, category: 'paid', min: 100, max: 5000 },
        'pay_x_v1': { name: '✖️ تفاعلات منصة X', price: 4000, category: 'paid', min: 100, max: 1000 },
        'pay_store_create': { name: '🛒 خدمة إنشاء متجر متكامل', price: 30000, category: 'paid', min: 1, max: 1 },
        'pay_rand_tk_acc': { name: '👑 حساب تيك توك عشوائي فاخر', price: 50000, category: 'special', min: 1, max: 1 },
        'pay_recover_acc': { name: '🛡️ خدمة استرداد حساب مسروق/مهكر', price: 40000, category: 'special', min: 1, max: 1 },
        'free_service_1': { name: '🎁 مجاني: 100 مشاهدة تيك توك مصغرة', price: 0, category: 'free', min: 100, max: 1000 },
        'free_service_2': { name: '🎁 مجاني: 20 لايك انستقرام مصغر', price: 0, category: 'free', min: 20, max: 500 }
    }
};

function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            db.users = parsed.users || {};
            db.admins = parsed.admins || { [OWNER_CHAT_ID]: { role: 'owner', name: `المالك الرئيسي (@${OWNER_USERNAME})`, addedBy: 'System' }};
            db.giftCodes = parsed.giftCodes || {};
            db.pointCoupons = parsed.pointCoupons || {};
            db.publisherAds = parsed.publisherAds || [];
            db.auditLogs = parsed.auditLogs || [];
            db.errorLogs = parsed.errorLogs || [];
            db.systemSettings = parsed.systemSettings || { botStatus: 'يعمل 🟢', maintenanceMode: false };
            if (parsed.services) {
                db.services = { ...db.services, ...parsed.services };
            }
        } catch (e) {
            console.error('خطأ في قراءة قاعدة البيانات:', e);
        }
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('خطأ في حفظ قاعدة البيانات:', e);
    }
}

loadDatabase();

function logAction(adminId, adminName, actionDesc) {
    const logEntry = {
        time: new Date().toISOString(),
        adminId: adminId.toString(),
        adminName: adminName,
        action: actionDesc
    };
    db.auditLogs.unshift(logEntry);
    if (db.auditLogs.length > 100) db.auditLogs.pop();
    saveDatabase();
}

function logError(errMessage) {
    const errEntry = {
        time: new Date().toISOString(),
        error: errMessage
    };
    db.errorLogs.unshift(errEntry);
    if (db.errorLogs.length > 50) db.errorLogs.pop();
    saveDatabase();
}

async function checkSecurityThreat(update, chatId) {
    const rawStr = JSON.stringify(update);
    const suspiciousPatterns = ['SELECT *', 'DROP TABLE', '<script>', 'eval(', '__proto__', '../', 'cmd.exe', 'bash -i'];
    let isThreat = false;
    for (const pat of suspiciousPatterns) {
        if (rawStr.includes(pat)) {
            isThreat = true;
            break;
        }
    }

    if (isThreat && !securityState.isLocked) {
        securityState.isLocked = true;
        securityState.lockReason = 'محاولة تلاعب أو اختراق برمجية';
        securityState.lockTime = Date.now();

        const alertText = `🚨🚨 **تنبيه أمني خطير جداً!**\n\n` +
            `⚠️ رصد نظام الحماية محاولة تلاعب أو اختراق من المستخدم: \`${chatId}\`\n` +
            `🔒 **تم تفعيل وضع الأمان وقفل البوت تلقائياً لحماية قاعدة البيانات والسيرفر!**\n` +
            `⏱️ جاري مراقبة النظام وسيتم إعادة تشغيل البوت تلقائياً فور زوال الخطر.`;
        
        await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: OWNER_CHAT_ID, text: alertText, parse_mode: 'Markdown' }).catch(()=>{});
        
        setTimeout(() => {
            securityState.isLocked = false;
            securityState.lockReason = null;
            axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id: OWNER_CHAT_ID, text: `🟢 **تم انتهاء الخطر وإلغاء وضع الأمان، البوت يعمل الآن تلقائياً بكامل كفاءته!**`, parse_mode: 'Markdown' }).catch(()=>{});
        }, 120000);
    }
}

async function sendMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
    if (securityState.isLocked && chatId.toString() !== OWNER_CHAT_ID.toString()) {
        return; 
    }
    try {
        const payload = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
        return response.data.result.message_id;
    } catch (error) {
        logError(error.response?.data?.description || error.message);
    }
}

async function editMessageText(chatId, messageId, text, replyMarkup = null) {
    try {
        const payload = { chat_id: chatId, message_id: messageId, text: text, parse_mode: 'Markdown' };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        await axios.post(`${TELEGRAM_API}/editMessageText`, payload);
    } catch (error) {}
}

function isAdmin(chatId) {
    return db.admins[chatId.toString()] !== undefined;
}

function isOwner(chatId) {
    return chatId.toString() === OWNER_CHAT_ID.toString();
}

function isPublisherEmployee(username, chatId) {
    return username === EMPLOYEE_USERNAME || db.admins[chatId.toString()]?.role === 'publisher';
}

function getServiceNiceName(data) {
    return db.services[data]?.name || data;
}

function getUserLevel(ordersCount) {
    if (ordersCount >= 20) return { name: '🏆 أسطورة المتجر (مستوى 3)', discount: 0.15 };
    if (ordersCount >= 10) return { name: '⭐ عميل مميز (مستوى 2)', discount: 0.10 };
    if (ordersCount >= 5) return { name: '🥉 عميل برونزي (مستوى 1)', discount: 0.05 };
    return { name: '👤 مبتدئ (مستوى 0)', discount: 0.0 };
}

app.post(`/webhook/${TOKEN}`, async (req, res) => {
    try {
        const update = req.body;
        const chatId = update.message?.chat?.id?.toString() || update.callback_query?.message?.chat?.id?.toString();

        if (chatId) {
            await checkSecurityThreat(update, chatId);
        }

        if (securityState.isLocked && chatId && chatId.toString() !== OWNER_CHAT_ID.toString()) {
            await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: `🔒 **البوت في وضع الأمان والصيانة المؤقتة ضد التهديدات.**\nيرجى الانتظار قليلاً ريثما يعود العمل تلقائياً.`
            }).catch(()=>{});
            return res.sendStatus(200);
        }

        if (update.message) {
            const chatId = update.message.chat.id.toString();
            const text = update.message.text;
            const userName = update.message.from.first_name || 'مستخدم';
            const userUsername = update.message.from.username ? `@${update.message.from.username}` : 'لا يوجد';
            const cleanUsername = update.message.from.username || '';

            if (!db.users[chatId]) {
                db.users[chatId] = {
                    name: userName,
                    username: userUsername,
                    points: 0,
                    ordersCount: 0,
                    lastDaily: 0,
                    lastWheel: 0,
                    lastBoxes: 0,
                    lastFlagGame: 0,
                    lastMathGame: 0,
                    orders: [],
                    transfers: [],
                    referredBy: null,
                    referralCount: 0,
                    waitingForInput: null,
                    waitingForQuantity: null,
                    waitingForGiftCreation: false,
                    waitingForBroadcast: false,
                    waitingForAdCreation: false,
                    waitingForAdSuggestion: false,
                    waitingForTransferId: null,
                    waitingForTransferTarget: null,
                    waitingForPointCouponCreate: false,
                    waitingForPointCouponApply: false,
                    lastTiktokTaskTime: 0
                };
                saveDatabase();

                if (!isAdmin(chatId) && cleanUsername !== EMPLOYEE_USERNAME) {
                    let notifyAdminText = `🚨 **عضو جديد دخل البوت!**\n\n` +
                        `👤 الاسم: ${userName}\n` +
                        `🔗 المعرف: ${userUsername}\n` +
                        `🆔 الأيدي: \`${chatId}\``;
                    await sendMessage(OWNER_CHAT_ID, notifyAdminText);
                }
            } else {
                db.users[chatId].name = userName;
                db.users[chatId].username = userUsername;
            }

            const user = db.users[chatId];

            if (user.isBanned && !isAdmin(chatId)) {
                await sendMessage(chatId, `❌ **عذراً، تم حظرك من استخدام البوت بواسطة الإدارة.**`);
                return res.sendStatus(200);
            }

            if (cleanUsername === EMPLOYEE_USERNAME && text && text.startsWith('/start')) {
                await sendMessage(chatId, `✨ **منور البوت يا الأدمن!**\n👤 اسم المستخدم المعتمد: @${EMPLOYEE_USERNAME}`);
                showPublisherMenu(chatId);
                return res.sendStatus(200);
            }

            if (user.waitingForAdCreation) {
                user.waitingForAdCreation = false;
                saveDatabase();
                const adText = text;
                const adId = 'AD-' + Math.floor(1000 + Math.random() * 9000);
                db.publisherAds.push({
                    adId: adId,
                    publisher: chatId,
                    content: adText,
                    status: 'قيد انتظار موافقة الرئيس ⏳',
                    time: Date.now()
                });
                saveDatabase();

                await sendMessage(chatId, `✅ **تم إرسال إعلانك بنجاح إلى الإدارة للمراجعة!**\n🆔 رقم الإعلان: \`${adId}\``);

                const ownerAdMsg = `📢 **طلب موافقة على نشر إعلان جماعي جديد!**\n\n` +
                    `👤 الموظف: @${EMPLOYEE_USERNAME} (\`${chatId}\`)\n` +
                    `🆔 رقم الإعلان: \`${adId}\`\n\n` +
                    `📝 **محتوى الإعلان:**\n${adText}`;
                
                const ownerAdKb = {
                    inline_keyboard: [
                        [
                            { text: '✅ الموافقة ونشر الإعلان', callback_data: `approve_ad_${adId}` },
                            { text: '❌ رفض الإعلان', callback_data: `reject_ad_${adId}` }
                        ]
                    ]
                };
                await sendMessage(OWNER_CHAT_ID, ownerAdMsg, ownerAdKb);
                return res.sendStatus(200);
            }

            if (user.waitingForAdSuggestion) {
                user.waitingForAdSuggestion = false;
                saveDatabase();
                const suggestionText = text;

                await sendMessage(chatId, `✅ **تم إرسال مقترح الحملة التسويقية للرئيس بنجاح!** شكراً لجهودك.`);
                await sendMessage(OWNER_CHAT_ID, `💡 **مقترح حملة تسويقية جديد من المسؤول @${EMPLOYEE_USERNAME}:**\n\n${suggestionText}`);
                return res.sendStatus(200);
            }

            if (isAdmin(chatId)) {
                const adminName = userName;

                if (user.waitingForAddAdmin) {
                    user.waitingForAddAdmin = false;
                    saveDatabase();
                    const targetId = text.trim();
                    if (isNaN(targetId)) {
                        await sendMessage(chatId, `❌ الأيدي غير صحيح.`);
                        return res.sendStatus(200);
                    }
                    db.admins[targetId] = { role: 'admin', name: 'أدمن', addedBy: `${adminName} (${chatId})` };
                    saveDatabase();
                    logAction(chatId, adminName, `إضافة أدمن جديد برقم الأيدي: ${targetId}`);
                    await sendMessage(chatId, `✅ تم تعيين المستخدم \`${targetId}\` كأدمن بنجاح.`);
                    return res.sendStatus(200);
                }

                if (user.waitingForBroadcast) {
                    user.waitingForBroadcast = false;
                    saveDatabase();
                    logAction(chatId, adminName, `إرسال إذاعة عامة للمشتركين`);
                    const allUserIds = Object.keys(db.users);
                    let successCount = 0;
                    for (const uid of allUserIds) {
                        try {
                            await sendMessage(uid, `📢 **إعلان / رسالة إدارية هامة:**\n\n${text}`);
                            successCount++;
                        } catch (e) {}
                    }
                    await sendMessage(chatId, `✅ **تم إرسال الإذاعة بنجاح إلى (${successCount}) مشترك.**`);
                    return res.sendStatus(200);
                }

                if (user.waitingForGiftCreation) {
                    user.waitingForGiftCreation = false;
                    saveDatabase();
                    const parts = text.split(' ');
                    const pointsAmount = parseInt(parts[0]);
                    const hoursDuration = parseInt(parts[1]) || 24;

                    if (isNaN(pointsAmount) || pointsAmount <= 0) {
                        await sendMessage(chatId, `❌ **خطأ!** الصيغة: \`النقاط الساعات\` مثل \`100 24\``);
                        return res.sendStatus(200);
                    }

                    const codeId = 'GIFT-' + Math.floor(100000 + Math.random() * 900000);
                    const expiresAt = Date.now() + (hoursDuration * 60 * 60 * 1000);

                    db.giftCodes[codeId] = { points: pointsAmount, expiresAt: expiresAt, usedBy: [] };
                    saveDatabase();

                    const giftLink = `https://t.me/${BOT_USERNAME}?start=${codeId}`;
                    await sendMessage(chatId, `✅ **تم إنشاء رابط الهدية بنجاح!**\n🎁 النقاط: ${pointsAmount}\n🔗 الرابط:\n${giftLink}`);
                    return res.sendStatus(200);
                }

                if (user.waitingForPointCouponCreate) {
                    user.waitingForPointCouponCreate = false;
                    saveDatabase();
                    const parts = text.split(' ');
                    const couponCode = parts[0]?.toUpperCase();
                    const pointsAmt = parseInt(parts[1]);

                    if (!couponCode || isNaN(pointsAmt) || pointsAmt <= 0) {
                        await sendMessage(chatId, `❌ **خطأ!** الصيغة الصحيحة: \`الكود عدد_النقاط\` مثل \`ABOD50 50\``);
                        return res.sendStatus(200);
                    }

                    db.pointCoupons[couponCode] = { points: pointsAmt, usedBy: [] };
                    saveDatabase();

                    await sendMessage(chatId, `✅ **تم إنشاء كوبون النقاط بنجاح!**\n🎫 الكود: \`${couponCode}\`\n🪙 النقاط: *${pointsAmt} نقطة*`);
                    return res.sendStatus(200);
                }
            }

            if (user.waitingForPointCouponApply) {
                user.waitingForPointCouponApply = false;
                saveDatabase();
                const couponCode = text.trim().toUpperCase();

                if (!db.pointCoupons[couponCode]) {
                    await sendMessage(chatId, `❌ **عذراً، كود الكوبون غير صالح أو غير موجود!**`);
                    showMainMenu(chatId);
                    return res.sendStatus(200);
                }

                const couponObj = db.pointCoupons[couponCode];
                if (couponObj.usedBy.includes(chatId)) {
                    await sendMessage(chatId, `⚠️ **لقد استخدمت هذا الكوبون مسبقاً!**`);
                    showMainMenu(chatId);
                    return res.sendStatus(200);
                }

                couponObj.usedBy.push(chatId);
                user.points += couponObj.points;
                saveDatabase();

                await sendMessage(chatId, `🎉 **مبروك يا غالي! تم تفعيل الكوبون بنجاح.**\n🎁 تم إضافة *${couponObj.points} نقطة* إلى رصيدك.\nرصيدك الحالي: *${user.points} نقطة* 🪙.`);
                showMainMenu(chatId);
                return res.sendStatus(200);
            }

            if (user.waitingForFlagAnswer) {
                const correctFlag = user.waitingForFlagAnswer;
                user.waitingForFlagAnswer = null;
                saveDatabase();

                if (text.trim() === correctFlag) {
                    user.points += 50;
                    saveDatabase();
                    await sendMessage(chatId, `🎉 **إجابة صحيحة!** ربحت *50 نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                } else {
                    user.points += 15;
                    saveDatabase();
                    await sendMessage(chatId, `❌ **إجابة خاطئة!** العلم الصحيح كان: ${correctFlag}\nتم منحك *15 نقطة* كتعويض 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                }
                showMainMenu(chatId);
                return res.sendStatus(200);
            }

            if (user.waitingForMathAnswer) {
                const correctAnswer = user.waitingForMathAnswer;
                user.waitingForMathAnswer = null;
                saveDatabase();

                if (parseInt(text.trim()) === correctAnswer) {
                    user.points += 50;
                    saveDatabase();
                    await sendMessage(chatId, `🎉 **إجابة صحيحة!** ربحت *50 نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                } else {
                    user.points += 15;
                    saveDatabase();
                    await sendMessage(chatId, `❌ **إجابة خاطئة!** الناتج الصحيح كان: ${correctAnswer}\nتم منحك *15 نقطة* كتعويض 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                }
                showMainMenu(chatId);
                return res.sendStatus(200);
            }

            if (text && text.startsWith('/start')) {
                const args = text.split(' ');
                if (args[1]) {
                    const param = args[1];
                    if (param.startsWith('ref_')) {
                        const referrerId = param.replace('ref_', '');
                        if (referrerId !== chatId && db.users[referrerId] && !user.referredBy) {
                            user.referredBy = referrerId;
                            db.users[referrerId].referralCount = (db.users[referrerId].referralCount || 0) + 1;
                            db.users[referrerId].points += 10;
                            saveDatabase();
                            await sendMessage(referrerId, `👥 **تم تسجيل إحالة جديدة عبر رابطك!**\n🎁 تم إضافة 10 نقاط إلى رصيدك.`);
                        }
                    } else if (db.giftCodes[param]) {
                        const gift = db.giftCodes[param];
                        if (Date.now() > gift.expiresAt) {
                            await sendMessage(chatId, `❌ **عذراً، انتهت صلاحية رابط الهدية هذا!**`);
                        } else if (gift.usedBy.includes(chatId)) {
                            await sendMessage(chatId, `⚠️ **لقد قمت باستلام هذه الهدية مسبقاً!**`);
                        } else {
                            gift.usedBy.push(chatId);
                            user.points += gift.points;
                            saveDatabase();
                            await sendMessage(chatId, `🎉 **مبروك! تم استلام الهدية بنجاح.**\n🎁 تمت إضافة *${gift.points} نقطة* إلى رصيدك.`);
                        }
                    }
                }
                
                if (cleanUsername === EMPLOYEE_USERNAME) {
                    showPublisherMenu(chatId);
                } else {
                    showMainMenu(chatId);
                }
                return res.sendStatus(200);
            }

            if (user.waitingForTransferId) {
                const targetId = text.trim();
                if (targetId === chatId) {
                    user.waitingForTransferId = null;
                    saveDatabase();
                    await sendMessage(chatId, `❌ لا يمكنك تحويل النقاط لنفسك.`);
                    return res.sendStatus(200);
                }
                if (!db.users[targetId]) {
                    user.waitingForTransferId = null;
                    saveDatabase();
                    await sendMessage(chatId, `❌ معرف المستخدم (ID) غير مسجل في البوت.`);
                    return res.sendStatus(200);
                }
                user.waitingForTransferTarget = targetId;
                user.waitingForTransferId = null;
                saveDatabase();
                await sendMessage(chatId, `💳 **أدخل عدد النقاط المراد تحويلها:**\n(الحد الأعلى 100 نقطة وعمولة 5%)`);
                return res.sendStatus(200);
            }

            if (user.waitingForTransferTarget) {
                const targetId = user.waitingForTransferTarget;
                user.waitingForTransferTarget = null;
                saveDatabase();
                const amount = parseInt(text);
                
                if (isNaN(amount) || amount <= 0 || amount > 100) {
                    await sendMessage(chatId, `❌ الحد الأعلى للتحويل هو 100 نقطة، ويجب أن يكون الرقم صحيحاً.`);
                    return res.sendStatus(200);
                }

                const now = Date.now();
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                user.weeklyTransfers = user.weeklyTransfers || [];
                user.weeklyTransfers = user.weeklyTransfers.filter(t => now - t < oneWeek);

                if (user.weeklyTransfers.length >= 2) {
                    await sendMessage(chatId, `⚠️ **عذراً، لقد استنفدت الحد الأقصى للتحويل (مرتين أسبوعياً).**`);
                    return res.sendStatus(200);
                }

                const commission = Math.ceil(amount * 0.05);
                const totalDeduct = amount + commission;

                if (user.points < totalDeduct) {
                    await sendMessage(chatId, `❌ رصيدك غير كافٍ! تحويل ${amount} نقطة مع عمولة 5% يتطلب إجمالي *${totalDeduct} نقطة*.`);
                    return res.sendStatus(200);
                }

                user.points -= totalDeduct;
                user.weeklyTransfers.push(now);
                db.users[targetId].points += amount;

                user.transfers.push({ type: 'send', target: targetId, amount: amount, time: now });
                db.users[targetId].transfers.push({ type: 'receive', from: chatId, amount: amount, time: now });
                saveDatabase();

                await sendMessage(chatId, `✅ **تم تحويل النقاط بنجاح!**\nتم إرسال ${amount} نقطة إلى المستخدم \`${targetId}\`.`);
                await sendMessage(targetId, `🎁 **وصلك تحويل نقاط جديد!**\nتم استلام ${amount} نقطة من المستخدم \`${chatId}\`.`);
                return res.sendStatus(200);
            }

            if (user.waitingForQuantity) {
                const pendingService = user.waitingForQuantity;
                user.waitingForQuantity = null;
                saveDatabase();
                const quantity = parseInt(text);

                if (isNaN(quantity) || quantity < 100) {
                    await sendMessage(chatId, `❌ **عذراً، الحد الأدنى للطلب هو 100** (أدخل رقماً صحيحاً):`);
                    user.waitingForQuantity = pendingService;
                    saveDatabase();
                    return res.sendStatus(200);
                }

                user.pendingServiceOrder = { serviceKey: pendingService, quantity: quantity };
                saveDatabase();

                const promptTargetMsg = `🌟 | يجب أن يكون حسابك عاماً!\n` +
                    `⏳ | وقت البدء الفوري: 0 - 2 دقيقة\n` +
                    `🌿 | الضمان : متوفر وفعال\n` +
                    `❌ | تأكد من صحة الرابط قبل الإرسال\n` +
                    `✅ | **أرسل رابط الحساب أو المنشور الآن :**`;

                await sendMessage(chatId, promptTargetMsg);
                user.waitingForInput = pendingService;
                saveDatabase();
                return res.sendStatus(200);
            }

            if (text) {
                if (user.waitingForInput) {
                    const pendingService = user.waitingForInput;
                    user.waitingForInput = null;
                    const orderInfo = user.pendingServiceOrder || { serviceKey: pendingService, quantity: 100 };
                    user.pendingServiceOrder = null;
                    saveDatabase();

                    if (text.length < 3 || (!text.includes('http') && !text.includes('@') && !text.includes('www.'))) {
                        await sendMessage(chatId, `❌ **الرابط غير صحيح!** يرجى إرسال رابط صحيح وتأكد أن الحساب عام:`);
                        user.waitingForInput = pendingService;
                        user.pendingServiceOrder = orderInfo;
                        saveDatabase();
                        return res.sendStatus(200);
                    }

                    const targetInput = text;
                    const serviceData = db.services[pendingService];
                    let basePrice = serviceData ? serviceData.price : 5000;
                    let cost = Math.round((basePrice / 1000) * orderInfo.quantity);
                    if (cost < 1) cost = basePrice; 

                    if (serviceData && serviceData.category === 'free') {
                        const orderId = Math.floor(1000000 + Math.random() * 9000000).toString();
                        const orderObj = {
                            orderId: orderId,
                            serviceKey: pendingService,
                            serviceName: serviceData.name,
                            target: targetInput,
                            quantity: orderInfo.quantity,
                            cost: 0,
                            status: 'قيد مراجعة وتأكيد الإدارة ⏳',
                            rating: null,
                            time: Date.now(),
                            userId: chatId,
                            userName: userName
                        };
                        user.orders.push(orderObj);
                        user.lastOrder = orderId;
                        saveDatabase();

                        const freeSuccessMsg = `✅| تم استلام طلبك : ${orderId}\n` +
                            `💰| التكلفة: 0 نقطة (مجاني)\n` +
                            `🆔| ايدي الطلب: ${orderId}\n` +
                            `💎| نقاطك الحالية: ${user.points} نقطة\n` +
                            `🔎| لمعرفة حالة طلبك استخدم زر فحص الطلب 🔎`;

                        await sendMessage(chatId, freeSuccessMsg);
                        return res.sendStatus(200);
                    }

                    const level = getUserLevel(user.ordersCount);
                    let discountRate = level.discount;

                    if (cost > 0 && discountRate > 0) {
                        cost = Math.round(cost * (1 - discountRate));
                    }

                    if (user.points < cost) {
                        await sendMessage(chatId, `❌ **عذراً، رصيدك غير كافٍ!**\nلديك *${user.points} نقطة* وتحتاج إلى *${cost} نقطة*.`);
                        return res.sendStatus(200);
                    }
                    user.points -= cost;

                    user.ordersCount += 1;
                    const orderId = Math.floor(1000000 + Math.random() * 9000000).toString();
                    
                    const orderObj = {
                        orderId: orderId,
                        serviceKey: pendingService,
                        serviceName: getServiceNiceName(pendingService),
                        target: targetInput,
                        quantity: orderInfo.quantity,
                        cost: cost,
                        status: 'جاري التنفيذ 🚀',
                        rating: null,
                        time: Date.now(),
                        userId: chatId,
                        userName: userName
                    };
                    user.orders.push(orderObj);
                    user.lastOrder = orderId;
                    saveDatabase();

                    const newOrderMsg = `✅| تم استلام طلبك : ${orderId}\n` +
                        `💰| التكلفة: ${cost} نقطة\n` +
                        `🆔| ايدي الطلب: ${orderId}\n` +
                        `💎| نقاطك الحالية: ${user.points} نقطة\n` +
                        `🔎| لمعرفة حالة طلبك استخدم زر فحص الطلب 🔎`;

                    await sendMessage(chatId, newOrderMsg);

                    const adminMsg = `🚨 **طلب شراء مدفوع جديد!**\n\n` +
                        `👤 العميل: [${userName}](tg://user?id=${chatId})\n` +
                        `🏷️ المعرف (ID): \`${chatId}\`\n` +
                        `📦 الخدمة: ${getServiceNiceName(pendingService)}\n` +
                        `🔢 الكمية: ${orderInfo.quantity}\n` +
                        `🔗 الرابط: \`${targetInput}\`\n` +
                        `📌 رقم الطلب: \`${orderId}\`\n` +
                        `🪙 التكلفة: ${cost} نقطة`;

                    const adminKeyboard = {
                        inline_keyboard: [
                            [
                                { text: '✅ إتمام الطلب', callback_data: `admin_done_${chatId}_${orderId}` },
                                { text: '❌ رفض الطلب', callback_data: `admin_fail_${chatId}_${orderId}` }
                            ]
                        ]
                    };

                    await sendMessage(OWNER_CHAT_ID, adminMsg, adminKeyboard);
                    return res.sendStatus(200);
                }
            }
        } 
        else if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const chatId = callbackQuery.message.chat.id.toString();
            const messageId = callbackQuery.message.message_id;
            const data = callbackQuery.data;
            const cbUsername = callbackQuery.from.username || '';

            if (!db.users[chatId]) {
                db.users[chatId] = { name: 'مستخدم', username: 'لا يوجد', points: 0, ordersCount: 0, orders: [], transfers: [], referralCount: 0 };
                saveDatabase();
            }
            const user = db.users[chatId];
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (data === 'main_menu') {
                user.waitingForInput = null;
                user.waitingForQuantity = null;
                if (cbUsername === EMPLOYEE_USERNAME) {
                    showPublisherMenu(chatId, messageId, true);
                } else {
                    showMainMenu(chatId, messageId, true);
                }
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'publisher_panel') {
                if (!isPublisherEmployee(cbUsername, chatId)) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '❌ هذا القسم مخصص لمسؤول النشر فقط!', show_alert: true });
                    return res.sendStatus(200);
                }
                showPublisherMenu(chatId, messageId, true);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'pub_add_ad') {
                if (!isPublisherEmployee(cbUsername, chatId)) return res.sendStatus(200);
                user.waitingForAdCreation = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `📢 **إضافة منشور أو عرض تسويقي جديد:**\nأرسل الآن نص الإعلان أو العرض لرفعه للإدارة للموافقة عليه:`, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'publisher_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'pub_my_ads') {
                if (!isPublisherEmployee(cbUsername, chatId)) return res.sendStatus(200);
                const myAds = (db.publisherAds || []).filter(a => a.publisher === chatId);
                let adsTxt = `📋 **إعلاناتك الخاصة وإدارتها (${myAds.length}):**\n\n`;
                if (myAds.length === 0) {
                    adsTxt += `ليس لديك أي إعلانات مسجلة حتى الآن.`;
                } else {
                    myAds.forEach((ad, idx) => {
                        adsTxt += `${idx+1}. \`${ad.adId}\` | الحالة: ${ad.status}\nمحتوى: ${ad.content.substring(0, 40)}...\n\n`;
                    });
                }
                await editMessageText(chatId, messageId, adsTxt, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'publisher_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'pub_suggest_campaign') {
                if (!isPublisherEmployee(cbUsername, chatId)) return res.sendStatus(200);
                user.waitingForAdSuggestion = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `💡 **إرسال اقتراح حملة تسويقية للرئيس:**\nأرسل تفاصيل المقترح في الشات الآن:`, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'publisher_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'pub_stats') {
                if (!isPublisherEmployee(cbUsername, chatId)) return res.sendStatus(200);
                const totalUsers = Object.keys(db.users).length;
                let totalReferrals = 0;
                Object.values(db.users).forEach(u => {
                    totalReferrals += (u.referralCount || 0);
                });

                const statsText = `📊 **إحصائيات قسم النشر والتسويق:**\n\n` +
                    `👥 عدد المشتركين الجدد في البوت: *${totalUsers} مشترك*\n` +
                    `🔗 إجمالي عدد الأشخاص الداخلين عبر روابط الإحالة: *${totalReferrals} شخص*\n` +
                    `📈 عدد الإعلانات المرسلة للمراجعة: *${db.publisherAds.length} إعلان*\n` +
                    `🟢 أداء الحملات: *ممتاز وفي قمة النشاط*`;

                await editMessageText(chatId, messageId, statsText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'publisher_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'pub_schedule') {
                if (!isPublisherEmployee(cbUsername, chatId)) return res.sendStatus(200);
                await editMessageText(chatId, messageId, `🗓️ **إدارة جدول النشر ومواعيد الإعلانات:**\n\n` +
                    `• النشر الصباحي: 10:00 صباحاً (متاح ✅)\n` +
                    `• النشر المسائي: 08:00 مساءً (متاح ✅)\n` +
                    `• العروض الخاصة: حسب الطلب والموافقة الفورية.`, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'publisher_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data.startsWith('approve_ad_') || data.startsWith('reject_ad_')) {
                if (!isAdmin(chatId)) return res.sendStatus(200);
                const isApprove = data.startsWith('approve_ad_');
                const adIdStr = data.replace(isApprove ? 'approve_ad_' : 'reject_ad_', '');
                
                const adObj = db.publisherAds.find(a => a.adId === adIdStr);
                if (adObj) {
                    adObj.status = isApprove ? 'مكتمل وممنوح الموافقة 🟢' : 'مرفوض ❌';
                    saveDatabase();
                }

                if (isApprove && adObj) {
                    const allUsers = Object.keys(db.users);
                    let sentCount = 0;
                    for (const uid of allUsers) {
                        try {
                            await sendMessage(uid, `📢 **عرض وإعلان تسويقي جديد:**\n\n${adObj.content}`);
                            sentCount++;
                        } catch (e) {}
                    }
                    await editMessageText(chatId, messageId, `✅ **تمت الموافقة على الإعلان (${adIdStr}) ونشره بنجاح إلى (${sentCount}) مشترك!**`);
                    await sendMessage(adObj.publisher, `🎉 **مبروك! تمت الموافقة على إعلانك (${adIdStr}) ونشره بنجاح لجميع المشتركين.**`);
                } else {
                    await editMessageText(chatId, messageId, `❌ **تم رفض الإعلان (${adIdStr}).**`);
                    if (adObj) {
                        await sendMessage(adObj.publisher, `❌ **عذراً، تم رفض إعلانك رقم (${adIdStr}) من قبل الإدارة.**`);
                    }
                }
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'bot_stats_public') {
                if (!isAdmin(chatId)) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '❌ هذا القسم مخصص للأدمنية فقط!', show_alert: true });
                    return res.sendStatus(200);
                }
                const totalUsers = Object.keys(db.users).length;
                let totalCompleted = 0;
                let totalPending = 0;
                Object.values(db.users).forEach(u => {
                    if (u.orders) {
                        u.orders.forEach(o => {
                            if (o.status.includes('مكتمل')) totalCompleted++;
                            else if (o.status.includes('جاري') || o.status.includes('انتظار')) totalPending++;
                        });
                    }
                });

                const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(uptimeSecs / 3600);
                const minutes = Math.floor((uptimeSecs % 3600) / 60);

                const memUsage = process.memoryUsage();
                const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);

                const statsText = `📊 **إحصائيات وصحة البوت المباشرة (خاص بالرئيس والأدمن):**\n\n` +
                    `🟢 حالة تشغيل البوت: *${db.systemSettings.botStatus}*\n` +
                    `🛡️ وضع الأمان الذكي ضد الاختراق: *${securityState.isLocked ? 'مفعل طوارئ 🔴' : 'مستقر ومؤمن 🟢'}*\n` +
                    `⚡ سرعة الاستجابة: *~2 مللي ثانية*\n` +
                    `👥 عدد المستخدمين الكلي: *${totalUsers}*\n` +
                    `📦 الطلبات المكتملة: *${totalCompleted}*\n` +
                    `⏳ الطلبات المعلقة: *${totalPending}*\n` +
                    `❌ الأعطال المسجلة: *${db.errorLogs.length}*\n` +
                    `⏱️ مدة التشغيل: *${hours} ساعة و ${minutes} دقيقة*\n` +
                    `📈 استهلاك الذاكرة (RAM): *${heapMB} MB*\n` +
                    `👤 يوزر الرئيس: @${abod097644}`;

                await editMessageText(chatId, messageId, statsText, {
                    inline_keyboard: [[{ text: '⬅️ العودة للقائمة الرئيسية', callback_data: 'main_menu' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'terms_of_use') {
                const termsText = `📜 **شروط الاستخدام وطريقة التعامل مع البوت:**\n\n` +
                    `1️⃣ **مرحباً بك في متجرنا الرقمي:** يرجى الالتزام بسياسات الطلب وعدم إدخال روابط وهمية.\n` +
                    `2️⃣ **طريقة تجميع النقاط:** يمكنك جمع النقاط مجاناً عبر الألعاب، التحديات، والإحالات.\n` +
                    `3️⃣ **شروط تنفيذ الطلبات:** يجب أن يكون الحساب أو المنشور **عاماً** لتتمكن النظام من إرسال الخدمة بنجاح.\n` +
                    `4️⃣ **حظر الاستخدام:** يحظر استخدام البوت بطرق احتيالية أو سبام لئلا يتم حظر حسابك نهائياً من قبل الإدارة.\n` +
                    `5️⃣ **الدعم الفني:** لأي استفسار أو مشكلة، تواصل مباشرة مع الدعم الفني عبر @${OWNER_USERNAME}.`;

                await editMessageText(chatId, messageId, termsText, {
                    inline_keyboard: [[{ text: '⬅️ العودة للقائمة الرئيسية', callback_data: 'main_menu' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data.startsWith('adm_') || data === 'owner_panel') {
                if (!isAdmin(chatId)) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '❌ غير مصرح لك بالوصول إلى لوحة الإدارة!', show_alert: true });
                    return res.sendStatus(200);
                }
            }

            if (data === 'owner_panel') {
                const adminKeyboard = {
                    inline_keyboard: [
                        [
                            { text: '👥 إدارة الأدمنية', callback_data: 'adm_manage_admins' },
                            { text: '📦 إدارة الخدمات', callback_data: 'adm_manage_services' }
                        ],
                        [
                            { text: '🪙 التحكم بالأرصدة', callback_data: 'adm_manage_points' },
                            { text: '📋 استعراض الطلبات', callback_data: 'adm_view_orders' }
                        ],
                        [
                            { text: '🚫 حظر/فك حظر', callback_data: 'adm_ban_menu' },
                            { text: '📢 إرسال إذاعة', callback_data: 'adm_broadcast' }
                        ],
                        [
                            { text: '🎁 إنشاء هدية / كوبون نقاط', callback_data: 'adm_coupons_menu' },
                            { text: '📊 إحصائيات البوت الشاملة', callback_data: 'adm_bot_stats' }
                        ],
                        [
                            { text: '📜 سجل العمليات والأعطال', callback_data: 'adm_audit_logs' },
                            { text: '⚙️ إعدادات النظام', callback_data: 'adm_system_settings' }
                        ],
                        [{ text: '⬅️ العودة للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `🛠️ **لوحة التحكم الشاملة للرئيس (@${OWNER_USERNAME}):**\nمرحباً بك يا رئيسنا، اختر القسم المطلوب:`, adminKeyboard);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_manage_admins') {
                let adminsList = `👥 **قائمة الأدمنية والصلاحيات:**\n\n`;
                Object.entries(db.admins).forEach(([id, info], idx) => {
                    adminsList += `${idx+1}. \`${id}\` — ${info.role} (${info.name})\n`;
                });
                await editMessageText(chatId, messageId, adminsList, {
                    inline_keyboard: [
                        [
                            { text: '➕ إضافة أدمن', callback_data: 'adm_add_admin_prompt' },
                            { text: '❌ حذف أدمن', callback_data: 'adm_remove_admin_prompt' }
                        ],
                        [{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]
                    ]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_add_admin_prompt') {
                user.waitingForAddAdmin = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `➕ أرسل الآن أيدي (Telegram ID) المستخدم المراد ترقيته لأدمن:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_manage_admins' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_remove_admin_prompt') {
                user.waitingForRemoveAdmin = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `❌ أرسل أيدي (Telegram ID) الأدمن المراد سحب صلاحياته:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_manage_admins' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_manage_services') {
                await editMessageText(chatId, messageId, `📦 **إدارة خدمات المتجر:**`, {
                    inline_keyboard: [
                        [
                            { text: '➕ إضافة خدمة', callback_data: 'adm_add_serv' },
                            { text: '🗑️ حذف خدمة', callback_data: 'adm_del_serv' }
                        ],
                        [
                            { text: '💵 تعديل الأسعار', callback_data: 'adm_edit_price' }
                        ],
                        [{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]
                    ]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_add_serv') {
                user.waitingForAddService = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `➕ أرسل بيانات الخدمة بالصيغة التالية:\n\`المفتاح | اسم الخدمة | السعر | الفئة\`\nمثال:\n\`boost_1 | 100 متابع تيك توك | 5000 | paid\``, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_manage_services' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_del_serv') {
                user.waitingForDeleteService = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🗑️ أرسل مفتاح الخدمة المراد حذفها (مثال: \`pay_tk_f1\`):`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_manage_services' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_edit_price') {
                user.waitingForEditPrice = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `💵 أرسل المفتاح والسعر الجديد بالصيغة:\n\`مفتاح_الخدمة السعر_الجديد\`\nمثال: \`pay_tk_f1 6000\``, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_manage_services' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_manage_points') {
                user.waitingForPointsControl = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🪙 أرسل أيدي (Telegram ID) المستخدم لتعديل نقاطه:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'owner_panel' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_view_orders') {
                let allOrders = [];
                Object.entries(db.users).forEach(([uid, u]) => {
                    if (u.orders) {
                        u.orders.forEach(o => allOrders.push({ ...o, uid }));
                    }
                });

                let ordText = `📋 **سجل كافة الطلبات (${allOrders.length}):**\n\n`;
                allOrders.slice(-15).forEach((ord, idx) => {
                    ordText += `${idx+1}. \`${ord.orderId}\` | العميل: \`${ord.uid}\`\nالخدمة: ${ord.serviceName}\nالحالة: ${ord.status}\n\n`;
                });

                await editMessageText(chatId, messageId, ordText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_ban_menu') {
                user.waitingForBanUser = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🚫 أرسل أيدي (Telegram ID) المستخدم لحظره أو فك حظره:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'owner_panel' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_broadcast') {
                user.waitingForBroadcast = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `📢 أرسل نص الإذاعة المراد إرسالها لجميع المشتركين:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'owner_panel' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_coupons_menu') {
                await editMessageText(chatId, messageId, `🎁 **قسم إنشاء الهدايا وكوبونات النقاط:**`, {
                    inline_keyboard: [
                        [{ text: '🎁 رابط نقاط أزرق', callback_data: 'admin_create_gift' }],
                        [{ text: '🎫 إنشاء كوبون نقاط', callback_data: 'admin_create_point_coupon' }],
                        [{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]
                    ]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'admin_create_gift') {
                user.waitingForGiftCreation = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎁 **إنشاء رابط نقاط أزرق:**\nأرسل بالصيغة: \`النقاط الساعات\` مثل \`100 24\``, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_coupons_menu' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'admin_create_point_coupon') {
                user.waitingForPointCouponCreate = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎫 **إنشاء كوبون نقاط جديد:**\nأرسل بالصيغة: \`الكود عدد_النقاط\` مثل \`ABOD50 50\``, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'adm_coupons_menu' }]]
                });
                return res.sendStatus(200);
            }

            if (data === 'adm_bot_stats') {
                const totalUsers = Object.keys(db.users).length;
                let totalCompleted = 0;
                let totalPending = 0;
                Object.values(db.users).forEach(u => {
                    if (u.orders) {
                        u.orders.forEach(o => {
                            if (o.status.includes('مكتمل')) totalCompleted++;
                            else if (o.status.includes('جاري') || o.status.includes('انتظار')) totalPending++;
                        });
                    }
                });

                const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(uptimeSecs / 3600);
                const minutes = Math.floor((uptimeSecs % 3600) / 60);

                const memUsage = process.memoryUsage();
                const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);

                const statsText = `📊 **لوحة تقارير وإحصائيات البوت الشاملة (للرئيس):**\n\n` +
                    `🟢 حالة تشغيل البوت: *${db.systemSettings.botStatus}*\n` +
                    `🛡️ وضع الأمان الذكي: *${securityState.isLocked ? 'مفعل طوارئ 🔴' : 'مستقر ومؤمن 🟢'}*\n` +
                    `⚡ سرعة استجابة البوت: *~3 مللي ثانية*\n` +
                    `👥 عدد المستخدمين الكلي: *${totalUsers}*\n` +
                    `📦 عدد الطلبات المكتملة: *${totalCompleted}*\n` +
                    `⏳ عدد الطلبات المعلقة: *${totalPending}*\n` +
                    `❌ عدد الأعطال المسجلة: *${db.errorLogs.length}*\n` +
                    `🔌 حالة اتصال Telegram API: *متصل وثابت 🟢*\n` +
                    `💾 حالة قاعدة البيانات: *مستقرة ومحدثة 🟢*\n` +
                    `⏱️ مدة التشغيل: *${hours} ساعة و ${minutes} دقيقة*\n` +
                    `📈 استهلاك الذاكرة (RAM): *${heapMB} MB*\n\n` +
                    `👤 يوزر الرئيس: @${abod097644}`;

                await editMessageText(chatId, messageId, statsText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_audit_logs') {
                let logText = `📜 **سجل العمليات الإدارية وآخر الأعطال:**\n\n` +
                    `🔹 **آخر العمليات الإدارية:**\n`;
                db.auditLogs.slice(0, 5).forEach((l, idx) => {
                    logText += `${idx+1}. [${l.adminName}] — ${l.action} (${l.time.substring(11, 19)})\n`;
                });

                logText += `\n🔴 **سجل الأعطال:**\n`;
                if (db.errorLogs.length === 0) {
                    logText += `لا توجد أخطاء مسجلة حالياً! 🟢\n`;
                } else {
                    db.errorLogs.slice(0, 3).forEach((e, idx) => {
                        logText += `${idx+1}. ${e.error} (${e.time.substring(11, 19)})\n`;
                    });
                }

                await editMessageText(chatId, messageId, logText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_system_settings') {
                const kb = {
                    inline_keyboard: [
                        [{ text: db.systemSettings.botStatus.includes('يعمل') ? '🔴 إيقاف البوت مؤقتاً' : '🟢 تشغيل البوت', callback_data: 'adm_toggle_bot' }],
                        [{ text: '⬅️ رجوع', callback_data: 'owner_panel' }]
                    ]
                };
                await editMessageText(chatId, messageId, `⚙️ **إعدادات النظام والتحكم بالتشغيل:**`, kb);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'adm_toggle_bot') {
                db.systemSettings.botStatus = db.systemSettings.botStatus.includes('يعمل') ? 'متوقف صيانة 🔴' : 'يعمل 🟢';
                saveDatabase();
                logAction(chatId, callbackQuery.from.first_name, `تغيير حالة البوت إلى: ${db.systemSettings.botStatus}`);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: `✅ تم تغيير حالة النظام بنجاح!`, show_alert: true });
                showMainMenu(chatId, messageId, true);
                return res.sendStatus(200);
            }

            if (data === 'redeem_point_coupon') {
                user.waitingForPointCouponApply = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎫 **تفعيل كوبون النقاط:**\nأرسل الآن كود الكوبون في الشات لإضافته لرصيدك:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'main_menu' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'daily_gift') {
                if (now - (user.lastDaily || 0) < oneDay) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ استلمت الهدية اليومية مسبقاً! انتظر 24 ساعة.', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastDaily = now;
                const giftPoints = 30;
                user.points += giftPoints;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎁 **استلمت هديلتك اليومية!**\nربحت *${giftPoints} نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`, {
                    inline_keyboard: [[{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]]
                });
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'games_menu') {
                const gamesKb = {
                    inline_keyboard: [
                        [{ text: '🎯 متابعة حساب تيك توك وربح (25 نقطة)', callback_data: 'task_tiktok_follow' }],
                        [{ text: '📦 لعبة الصناديق الحظ', callback_data: 'lucky_boxes' }],
                        [{ text: '🎡 عجلة الحظ اليومية', callback_data: 'lucky_wheel' }],
                        [{ text: '🌍 خمن العلم (سريع)', callback_data: 'play_flag' }],
                        [{ text: '🔢 الحساب السريع', callback_data: 'play_math' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `🎮 **قسم تجميع نقاط (ألعاب وتحديات سريعة ممتعة):**\nاختر التحدي المناسب لربح النقاط فوراً:`, gamesKb);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'task_tiktok_follow') {
                const targetTiktokUrl = 'https://www.tiktok.com/@e..e233?_r=1&_t=ZS-9B4Mz6fnzAP';
                const taskKb = {
                    inline_keyboard: [
                        [{ text: '🔗 اضغط هنا لمتابعة الحساب', url: targetTiktokUrl }],
                        [{ text: '✅ تأكيد المتابعة (استلام 25 نقطة)', callback_data: 'claim_tiktok_reward' }],
                        [{ text: '⬅️ رجوع', callback_data: 'games_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `🎯 **مهمة كسب 25 نقطة:**\n\n1. تابع الحساب على تيك توك.\n2. اضغط على زر **"تأكيد المتابعة"** لتحصل على النقاط فوراً!`, taskKb);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'claim_tiktok_reward') {
                const fastCheck = 60 * 1000; 
                if (now - (user.lastTiktokTaskTime || 0) < fastCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ يرجى الانتظار دقيقة قبل تكرار المهمة.', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastTiktokTaskTime = now;
                user.points += 25;
                saveDatabase();

                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '🎉 مبروك! تمت إضافة 25 نقطة إلى رصيدك بنجاح.', show_alert: true });
                showMainMenu(chatId, messageId, true);
                return res.sendStatus(200);
            }

            if (data === 'lucky_boxes') {
                const fastCheck = 60 * 1000; 
                if (now - (user.lastBoxes || 0) < fastCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ انتظر دقيقة واحدة للعب مرة أخرى!', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastBoxes = now;
                const boxesKb = {
                    inline_keyboard: [
                        [
                            { text: '📦 صندوق 1', callback_data: 'box_open' },
                            { text: '📦 صندوق 2', callback_data: 'box_open' },
                            { text: '📦 صندوق 3', callback_data: 'box_open' }
                        ],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `📦 **لعبة الصناديق السريعة:**\nاختر صندوقاً لربح جوائز فورية:`, boxesKb);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'box_open') {
                const prize = Math.floor(Math.random() * 70) + 30;
                user.points += prize;
                saveDatabase();
                await sendMessage(chatId, `📦 **اخترت الصندوق الرابح!**\nربحت *${prize} نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                showMainMenu(chatId, messageId, true);
            }

            else if (data === 'lucky_wheel') {
                const fastCheck = 60 * 1000;
                if (now - (user.lastWheel || 0) < fastCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ انتظر دقيقة واحدة لتدوير العجلة مرة أخرى!', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastWheel = now;
                const prize = Math.floor(Math.random() * 100) + 50;
                user.points += prize;
                saveDatabase();
                await sendMessage(chatId, `🎡 **دَارت عجلة الحظ السريعة وربحت:** *${prize} نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                showMainMenu(chatId, messageId, true);
            }

            else if (data === 'play_flag') {
                const fastCheck = 60 * 1000;
                if (now - (user.lastFlagGame || 0) < fastCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ انتظر دقيقة واحدة للعب مرة أخرى!', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastFlagGame = now;
                saveDatabase();

                const flags = [
                    { name: 'السعودية', flag: '🇸🇦' },
                    { name: 'الإمارات', flag: '🇦🇪' },
                    { name: 'الكويت', flag: '🇰🇼' },
                    { name: 'مصر', flag: '🇪🇬' },
                    { name: 'قطر', flag: '🇶🇦' }
                ];
                const selected = flags[Math.floor(Math.random() * flags.length)];
                user.waitingForFlagAnswer = selected.name;
                saveDatabase();

                await editMessageText(chatId, messageId, `🌍 **لعبة خمن العلم السريعة!**\n\nما هي الدولة صاحب هذا العلم؟\n${selected.flag}\n\n⏳ **أرسل اسم الدولة في الشات الآن (جائزة 50 نقطة)!**`);
                return res.sendStatus(200);
            }

            else if (data === 'play_math') {
                const fastCheck = 60 * 1000;
                if (now - (user.lastMathGame || 0) < fastCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ انتظر دقيقة واحدة للعب مرة أخرى!', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastMathGame = now;
                saveDatabase();

                const n1 = Math.floor(Math.random() * 50) + 10;
                const n2 = Math.floor(Math.random() * 50) + 10;
                const isPlus = Math.random() > 0.5;
                const correctAnswer = isPlus ? n1 + n2 : n1 - n2;
                const sign = isPlus ? '+' : '-';

                user.waitingForMathAnswer = correctAnswer;
                saveDatabase();

                await editMessageText(chatId, messageId, `🔢 **لعبة الحساب السريع!**\n\nاحسب الناتج التالي:\n\`${n1} ${sign} ${n2} = ?\`\n\n⏳ **أرسل الناتج في الشات الآن (جائزة 50 نقطة)!**`);
                return res.sendStatus(200);
            }

            else if (data === 'services_menu') {
                user.waitingForInput = null;
                user.waitingForQuantity = null;
                saveDatabase();
                const servKeyboard = {
                    inline_keyboard: [
                        [{ text: '⚡ مخزن العروض الخاصة والخدمات النووية', callback_data: 'special_store_menu' }],
                        [{ text: '🎵 TikTok خدمات تيك توك', callback_data: 'platform_tiktok' }],
                        [{ text: '📺 YouTube خدمات يوتيوب', callback_data: 'platform_youtube' }],
                        [{ text: '📸 Instagram خدمات انستقرام', callback_data: 'platform_insta' }],
                        [{ text: '💜 Twitch خدمات تويتش', callback_data: 'platform_twitch' }],
                        [{ text: '✈️ Telegram خدمات تيليجرام', callback_data: 'platform_telegram' }],
                        [{ text: '✖️ X (Twitter) خدمات منصة', callback_data: 'platform_x' }],
                        [{ text: '🛒 إنشاء متجر متكامل (30000 نقطة)', callback_data: 'pay_store_create' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `💎 **خدمات | متجر الخدمات الرقمية المتقدم:**\nاختر المنصة أو القسم المطلوب:`, servKeyboard);
            }

            else if (data === 'special_store_menu') {
                await editMessageText(chatId, messageId, `⚡ **مخزن العروض الخاصة والحصرية:**`, {
                    inline_keyboard: [
                        [{ text: '🔥 بيع حسابات تيك توك عشوائية', callback_data: 'pay_rand_tk_acc' }],
                        [{ text: '🛡️ استرداد حسابات مهكرة', callback_data: 'pay_recover_acc' }],
                        [{ text: '⬅️ رجوع للمتجر', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_tiktok') {
                await editMessageText(chatId, messageId, `🎵 **TikTok | قسم تيك توك (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '🔥 حفظ فيديو تيك توك(حقيقي %100) مدى الحياة', callback_data: 'pay_tk_f1' }],
                        [{ text: '🌿 مشاركات فيديو تيك توك العرب (مدى الحياة)', callback_data: 'pay_tk_f1' }],
                        [{ text: '💙 اعجابات فيديو تيك توك VIP مختلط عرب فوري', callback_data: 'pay_tk_f1' }],
                        [{ text: '📍 مشاهدات فيديو تيك توك VIP 100M بدء فوري', callback_data: 'pay_tk_v1' }],
                        [{ text: '🌿 مشاركات فيديو تيك توك العرب (ارخص سعر)', callback_data: 'pay_tk_f1' }],
                        [{ text: '🔒 حفظ فيديو تيك توك(حقيقي %100) الأرخص عالمياً', callback_data: 'pay_tk_f1' }],
                        [{ text: '📍 مشاهدات فيديو تيك توك الأرخص عرب مختلط', callback_data: 'pay_tk_v1' }],
                        [{ text: '👤 متابعين تيك توك VIP ثابت حقيقي عبر دعم فور', callback_data: 'pay_tk_f1' }],
                        [{ text: '⬅️ رجوع للمتجر', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_youtube') {
                await editMessageText(chatId, messageId, `📺 **YouTube | قسم يوتيوب (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '📺 مشتركين يوتيوب حقيقي', callback_data: 'pay_yt_f1' }],
                        [{ text: '📺 مشاهدات يوتيوب سريعة', callback_data: 'pay_yt_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_insta') {
                await editMessageText(chatId, messageId, `📸 **Instagram | قسم انستقرام (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '📸 متابعين انستقرام تفاعل عالي', callback_data: 'pay_in_f1' }],
                        [{ text: '📸 مشاهدات وستوري انستقرام', callback_data: 'pay_in_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_twitch') {
                await editMessageText(chatId, messageId, `💜 **Twitch | قسم تويتش (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '💜 متابعين تويتش نشطين', callback_data: 'pay_tw_f1' }],
                        [{ text: '💜 مشاهدات بث تويتش', callback_data: 'pay_tw_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_telegram') {
                await editMessageText(chatId, messageId, `✈️ **Telegram | قسم تيليجرام (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '✈️ متابعين وقنوات تيليجرام', callback_data: 'pay_tg_f1' }],
                        [{ text: '✈️ مشاهدات منشورات تيليجرام', callback_data: 'pay_tg_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_x') {
                await editMessageText(chatId, messageId, `✖️ **X (Twitter) | قسم منصة X (شراء مباشر):**`, {
                    inline_keyboard: [
                        [{ text: '✖️ متابعين منصة X الملكي', callback_data: 'pay_x_f1' }],
                        [{ text: '✖️ تفاعلات منصة X (لايكات/إعادة نشر)', callback_data: 'pay_x_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data.startsWith('pay_')) {
                const serviceKey = data;
                const serviceData = db.services[serviceKey];
                if (!serviceData) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '❌ الخدمة غير موجودة.', show_alert: true });
                    return res.sendStatus(200);
                }

                user.waitingForQuantity = serviceKey;
                saveDatabase();

                const selectQtyText = `💎 | اسم الخدمة : ${serviceData.name} 🚀\n` +
                    `🪙 | السعر : لكل 1000 ⇐ ${serviceData.price} نقطة\n` +
                    `🔻 | اقل طلب : 100\n` +
                    `🤖 | ايدي الخدمة : \`${serviceKey}\`\n\n` +
                    `✨ | **ارسل العدد الذي تريد طلبه (الحد الأدنى 100):**`;

                await editMessageText(chatId, messageId, selectQtyText, {
                    inline_keyboard: [
                        [{ text: '⬅️ رجوع للخدمات', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'my_orders') {
                const orders = user.orders || [];
                let txt = `📋 **سجل طلباتك السابقة والحالية (${orders.length}):**\n\n`;
                if (orders.length === 0) {
                    txt += `ليس لديك أي طلبات مسجلة حتى الآن!`;
                } else {
                    orders.slice(-10).forEach((ord, idx) => {
                        txt += `${idx + 1}. *الخدمة:* ${ord.serviceName}\n` +
                                     `📌 *الرقم:* \`${ord.orderId}\`\n` +
                                     `📊 *الحالة:* ${ord.status}\n` +
                                     `⭐ *التقييم:* ${ord.rating ? ord.rating + '/5 ⭐' : 'لم تقيم بعد'}\n\n`;
                    });
                }

                const kbRows = orders.length > 0 ? [
                    [{ text: '⭐ تقييم طلب مكتمل', callback_data: 'rate_choose_order' }],
                    [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                ] : [[{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]];

                await editMessageText(chatId, messageId, txt, { inline_keyboard: kbRows });
            }

            else if (data === 'rate_choose_order') {
                const completedOrders = (user.orders || []).filter(o => o.status.includes('مكتمل'));
                if (completedOrders.length === 0) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⚠️ ليس لديك طلبات مكتملة للتقييم!', show_alert: true });
                    return res.sendStatus(200);
                }
                let kb = completedOrders.map(o => [{ text: `⭐ تقييم طلب: ${o.orderId}`, callback_data: `rate_exec_${o.orderId}` }]);
                kb.push([{ text: '⬅️ رجوع', callback_data: 'my_orders' }]);
                await editMessageText(chatId, messageId, `⭐ **اختر رقم الطلب المراد تقييمه:**`, { inline_keyboard: kb });
            }

            else if (data.startsWith('rate_exec_')) {
                const orderId = data.replace('rate_exec_', '');
                await editMessageText(chatId, messageId, `⭐ **اختر تقييمك للطلب (${orderId}):**`, {
                    inline_keyboard: [
                        [
                            { text: '⭐ 1', callback_data: `rating_set_${orderId}_1` },
                            { text: '⭐⭐ 2', callback_data: `rating_set_${orderId}_2` },
                            { text: '⭐⭐⭐ 3', callback_data: `rating_set_${orderId}_3` }
                        ],
                        [
                            { text: '⭐⭐⭐⭐ 4', callback_data: `rating_set_${orderId}_4` },
                            { text: '⭐⭐⭐⭐⭐ 5', callback_data: `rating_set_${orderId}_5` }
                        ],
                        [{ text: '⬅️ رجوع', callback_data: 'my_orders' }]
                    ]
                });
            }

            else if (data.startsWith('rating_set_')) {
                const parts = data.split('_');
                const orderId = parts[2];
                const stars = parts[3];

                const ord = (user.orders || []).find(o => o.orderId === orderId);
                if (ord) {
                    ord.rating = stars;
                    saveDatabase();
                }

                await editMessageText(chatId, messageId, `✅ **شكراً لتقييمك الرائع بـ (${stars} نجوم)!**\nتم تسجيل تقييمك بنجاح يسعدنا خدمتك دائماً 🤍.`);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: `✅ شكراً لتقييمك!`, show_alert: true });
                return res.sendStatus(200);
            }

            else if (data === 'referral_system') {
                const refLink = `https://t.me/${BOT_USERNAME}?start=ref_${chatId}`;
                const refText = `👥 **نظام دعوة الأصدقاء (الإحالات):**\n\n` +
                    `🔗 رابط دعوتك الخاص:\n\`${refLink}\`\n\n` +
                    `🎁 المكافأة: 10 نقاط لكل صديق (الحد الأقصى 100 نقطة).\n` +
                    `👥 عدد المدعوين: *${user.referralCount || 0} شخص*.`;

                await editMessageText(chatId, messageId, refText, {
                    inline_keyboard: [
                        [{ text: '🏆 قائمة المتصدرين', callback_data: 'leaderboard' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                });
            }

            else if (data === 'leaderboard') {
                const sortedUsers = Object.entries(db.users)
                    .sort((a, b) => (b[1].referralCount || 0) - (a[1].referralCount || 0))
                    .slice(0, 5);

                let lbText = `🏆 **قائمة المتصدرين في الإحالات:**\n\n`;
                sortedUsers.forEach(([uid, u], idx) => {
                    lbText += `${idx + 1}. [${u.name}](tg://user?id=${uid}) — عدد الدعوات: *${u.referralCount || 0}* 👥\n`;
                });

                await editMessageText(chatId, messageId, lbText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: 'referral_system' }]]
                });
            }

            else if (data === 'transfer_points') {
                user.waitingForTransferId = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `💳 **تحويل النقاط:**\nأرسل معرف (ID) المستخدم المراد التحويل له:`, {
                    inline_keyboard: [[{ text: '⬅️ إلغاء', callback_data: 'main_menu' }]]
                });
            }

            else if (data === 'buy_points') {
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
                    callback_query_id: callbackQuery.id,
                    text: 'قريبًا جداً تفعيل بوابة شراء النقاط الشاملة! 🚀',
                    show_alert: true
                });
            }

            else if (data === 'my_account') {
                const level = getUserLevel(user.ordersCount);
                const accText = `👤 **معلومات حسابك والمستوى:**\n\n` +
                    `🪙 النقاط: *${user.points} نقطة*\n` +
                    `🏆 المستوى: *${level.name}*\n` +
                    `📉 الخصم: *${level.discount * 100}%*\n` +
                    `📦 الطلبات: *${user.ordersCount} طلب*\n` +
                    `🏷️ المعرف: \`${chatId}\``;
                
                await editMessageText(chatId, messageId, accText, {
                    inline_keyboard: [
                        [{ text: '🎁 الإحالات والدعوات', callback_data: 'referral_system' }],
                        [{ text: '💳 تحويل النقاط', callback_data: 'transfer_points' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                });
            }

            else if (data === 'track_order') {
                if (!user.lastOrder || !user.orders || user.orders.length === 0) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⚠️ ليس لديك طلبات لتتبعها!', show_alert: true });
                } else {
                    const lastOrd = user.orders[user.orders.length - 1];
                    await editMessageText(chatId, messageId, `📌 **متابعة الطلبات ونشاط البوت:**\nرقم الطلب: \`${lastOrd.orderId}\`\nالخدمة: ${lastOrd.serviceName}\nالحالة: ${lastOrd.status}`, {
                        inline_keyboard: [[{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]]
                    });
                }
            }

            else if (data === 'support') {
                const supportText = `🛠️ **الدعم الفني وخدمة العملاء:**\n\n` +
                    `🔹 الدعم الفني: @${OWNER_USERNAME}\n\n` +
                    `💡 **أي أحد عنده فكرة تنضاف للبوت يتواصل مع الدعم الفني مباشرة!**`;
                
                await editMessageText(chatId, messageId, supportText, {
                    inline_keyboard: [[{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]]
                });
            }

            else if (data.startsWith('admin_done_') || data.startsWith('admin_fail_')) {
                const parts = data.split('_');
                const action = parts[1];
                const targetUserChatId = parts[2];
                const orderIdStr = parts[3];

                const targetUser = db.users[targetUserChatId];
                if (targetUser && targetUser.orders) {
                    const ord = targetUser.orders.find(o => o.orderId === orderIdStr);
                    if (ord) {
                        ord.status = action === 'done' ? 'مكتمل ✅' : 'مرفوض / غير متاح ❌';
                        saveDatabase();
                    }
                }

                if (action === 'done') {
                    const ratingKeyboard = {
                        inline_keyboard: [
                            [
                                { text: '⭐ 1', callback_data: `rating_set_${orderIdStr}_1` },
                                { text: '⭐⭐ 2', callback_data: `rating_set_${orderIdStr}_2` },
                                { text: '⭐⭐⭐ 3', callback_data: `rating_set_${orderIdStr}_3` }
                            ],
                            [
                                { text: '⭐⭐⭐⭐ 4', callback_data: `rating_set_${orderIdStr}_4` },
                                { text: '⭐⭐⭐⭐⭐ 5', callback_data: `rating_set_${orderIdStr}_5` }
                            ]
                        ]
                    };
                    await sendMessage(targetUserChatId, `🎉 **مبروك!** تم إتمام طلبك رقم \`${orderIdStr}\` بنجاح ✅.\n\n⭐ **نود معرفة رأيك، كم تقييمك للخدمة معنا؟**`, ratingKeyboard);
                    await editMessageText(chatId, messageId, `✅ **تم تأكيد إتمام الطلب (${orderIdStr}) بنجاح وإرسال إشعار للعميل.**`);
                } else {
                    await sendMessage(targetUserChatId, `❌ **عذراً،** تم رفض أو إلغاء طلبك رقم \`${orderIdStr}\` ❌.`);
                    await editMessageText(chatId, messageId, `❌ **تم رفض الطلب (${orderIdStr}) وإشعار العميل.**`);
                }
                logAction(chatId, callbackQuery.from.first_name, `معالجة الطلب ${orderIdStr} بالحالة: ${action}`);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }
        }

        res.sendStatus(200);
    } catch (err) {
        logError(err.message);
        res.sendStatus(200);
    }
});

function showPublisherMenu(chatId, messageId = null, edit = false) {
    const pubText = `📢 **إدارة نشر البوت والإعلانات (خاص بالمسؤول):**\n\n` +
        `👤 اسم المستخدم المعتمد: @${EMPLOYEE_USERNAME}\n` +
        `✨ اختر العملية المطلوبة من الأزرار أدناه:`;

    const pubKeyboard = {
        inline_keyboard: [
            [{ text: '➕ نشر إعلان أو عرض تسويقي جديد', callback_data: 'pub_add_ad' }],
            [{ text: '📋 تعديل وحذف إعلاناتي الخاصة', callback_data: 'pub_my_ads' }],
            [{ text: '💡 إرسال اقتراح حملة تسويقية للرئيس', callback_data: 'pub_suggest_campaign' }],
            [{ text: '📊 مشاهدة إحصائيات المشتركين والروابط', callback_data: 'pub_stats' }],
            [{ text: '🗓️ إدارة جدول النشر والمواعيد', callback_data: 'pub_schedule' }],
            [{ text: '⬅️ العودة للقائمة الرئيسية', callback_data: 'main_menu' }]
        ]
    };

    if (edit && messageId) {
        editMessageText(chatId, messageId, pubText, pubKeyboard);
    } else {
        sendMessage(chatId, pubText, pubKeyboard);
    }
}

function showMainMenu(chatId, messageId = null, edit = false) {
    const user = db.users[chatId] || { points: 0, ordersCount: 0 };
    const level = getUserLevel(user.ordersCount);
    const menuText = `🌟 **متجر تيربو بلس الملكي | العوالم الرقمية المتقدمة** 🚀\n\n` +
        `🪙 رصيدك المتاح: *${user.points} نقطة*\n` +
        `🏆 مستواك الحالي: *${level.name}*\n\n` +
        `💎 منور المتجر يا غالي، اختر القسم الذي يعجبك:`;

    let keyboardRows = [
        [
            { text: '🎁 الهدية اليومية السريعة', callback_data: 'daily_gift' }
        ],
        [
            { text: '✨ خدمات', callback_data: 'services_menu' },
            { text: '👥 نظام الإحالات والأصدقاء', callback_data: 'referral_system' }
        ],
        [
            { text: '🎮 تجميع نقاط وألعاب', callback_data: 'games_menu' },
            { text: '🎫 تفعيل كوبون نقاط', callback_data: 'redeem_point_coupon' }
        ],
        [
            { text: '💳 تحويل النقاط للآخرين', callback_data: 'transfer_points' },
            { text: '💰 شراء النقاط الفورية', callback_data: 'buy_points' }
        ],
        [
            { text: '📜 شروط الاستخدام', callback_data: 'terms_of_use' },
            { text: '📋 سجل طلباتي السابقة', callback_data: 'my_orders' }
        ],
        [
            { text: '👤 حسابي والمستوى', callback_data: 'my_account' },
            { text: '🛠️ الدعم الفني', callback_data: 'support' }
        ],
        [
            { text: '📦 تتبع آخر طلب نشط', callback_data: 'track_order' }
        ]
    ];

    if (isAdmin(chatId)) {
        keyboardRows.push([{ text: '📊 إحصائيات وصحة البوت المباشرة (أدمن)', callback_data: 'bot_stats_public' }]);
        keyboardRows.push([{ text: '🛠️ لوحة تحكم الرئيس والأدمنية', callback_data: 'owner_panel' }]);
    }

    const menuKeyboard = { inline_keyboard: keyboardRows };

    if (edit && messageId) {
        editMessageText(chatId, messageId, menuText, menuKeyboard);
    } else {
        sendMessage(chatId, menuText, menuKeyboard);
    }
}

app.get('/', (req, res) => {
    res.send('Bot is running successfully with Higher Prices & Full Features!');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

setInterval(() => {
    const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    axios.get(appUrl).catch(() => {});
}, 10 * 60 * 1000);

setTimeout(() => {
    if (process.env.RENDER_EXTERNAL_URL) {
        axios.get(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${process.env.RENDER_EXTERNAL_URL}/webhook/${TOKEN}`).catch(() => {});
    }
}, 3000);
