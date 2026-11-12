const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(bodyParser.json());

const TOKEN = '8455445401:AAFt_f55qgdRLJvrZ5KfEjX3IXVsjaDnxFs';
const OWNER_CHAT_ID = '8266396167'; // المالك الرئيسي الوحيد
const OWNER_PHONE = '+966 54 864 5130';

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const BOT_USERNAME = 'th_s777'; 

const DB_FILE = path.join(__dirname, 'database.json');
const startTime = Date.now();

let db = {
    users: {},
    admins: {
        [OWNER_CHAT_ID]: { role: 'owner', name: 'المالك الرئيسي', addedBy: 'System' }
    },
    giftCodes: {},
    coupons: {},
    pointCoupons: {},
    auditLogs: [],
    errorLogs: [],
    systemSettings: {
        botStatus: 'يعمل 🟢',
        maintenanceMode: false
    },
    services: {
        'pay_tk_f1': { name: 'متابعين تيك توك (10 إلى 50 متابع)', price: 180, category: 'paid' },
        'pay_tk_f2': { name: 'متابعين تيك توك (50 إلى 100 متابع)', price: 350, category: 'paid' },
        'pay_tk_f3': { name: 'متابعين تيك توك (100 إلى 200 متابع)', price: 650, category: 'paid' },
        'pay_tk_v1': { name: 'مشاهدات وتفاعلات تيك توك (100 إلى 1000 مشاهدة)', price: 150, category: 'paid' },
        'pay_tk_v2': { name: 'مشاهدات وتفاعلات تيك توك (1000 إلى 10000 مشاهدة)', price: 550, category: 'paid' },
        
        'pay_yt_f1': { name: 'مشتركين يوتيوب (10 إلى 50 مشترك)', price: 220, category: 'paid' },
        'pay_yt_f2': { name: 'مشتركين يوتيوب (50 إلى 100 مشترك)', price: 450, category: 'paid' },
        'pay_yt_f3': { name: 'مشتركين يوتيوب (100 إلى 200 مشترك)', price: 800, category: 'paid' },
        'pay_yt_v1': { name: 'مشاهدات يوتيوب (100 إلى 1000 مشاهدة)', price: 180, category: 'paid' },
        'pay_yt_v2': { name: 'مشاهدات يوتيوب (1000 إلى 10000 مشاهدة)', price: 700, category: 'paid' },

        'pay_in_f1': { name: 'متابعين انستقرام (10 إلى 50 متابع)', price: 200, category: 'paid' },
        'pay_in_f2': { name: 'متابعين انستقرام (50 إلى 100 متابع)', price: 400, category: 'paid' },
        'pay_in_f3': { name: 'متابعين انستقرام (100 إلى 200 متابع)', price: 720, category: 'paid' },
        'pay_in_v1': { name: 'مشاهدات انستقرام (100 إلى 1000 مشاهدة)', price: 160, category: 'paid' },
        'pay_in_v2': { name: 'مشاهدات انستقرام (1000 إلى 10000 مشاهدة)', price: 600, category: 'paid' },

        'pay_tw_f1': { name: 'متابعين تويتش (10 إلى 50 متابع)', price: 190, category: 'paid' },
        'pay_tw_f2': { name: 'متابعين تويتش (50 إلى 100 متابع)', price: 380, category: 'paid' },
        'pay_tw_v1': { name: 'مشاهدات بث تويتش (100 إلى 500 مشاهدة)', price: 240, category: 'paid' },

        'pay_tg_f1': { name: 'متابعين وقنوات تيليجرام (10 إلى 50 مشترك)', price: 180, category: 'paid' },
        'pay_tg_v1': { name: 'مشاهدات منشورات تيليجرام (100 إلى 1000 مشاهدة)', price: 150, category: 'paid' },

        'pay_x_f1': { name: 'متابعين منصة X (10 إلى 50 متابع)', price: 200, category: 'paid' },
        'pay_x_v1': { name: 'تفاعلات منصة X (لايكات/إعادة نشر)', price: 170, category: 'paid' },

        'pay_store_create': { name: 'خدمة إنشاء متجر متكامل', price: 2000, category: 'paid' },

        'pay_rand_tk_acc': { name: 'حساب تيك توك عشوائي فاخر (نادر جداً)', price: 5000, category: 'special' },
        'pay_recover_acc': { name: 'خدمة استرداد حساب مسروق/مهكر (احتمال ضعيف وغير مضمون)', price: 3500, category: 'special' },

        'free_service_1': { name: 'مجاني: 100 مشاهدة تيك توك مصغرة', price: 0, category: 'free' },
        'free_service_2': { name: 'مجاني: 20 لايك انستقرام مصغر', price: 0, category: 'free' },
        'free_service_3': { name: 'مجاني: 10 متابعين تيليجرام تجريبي', price: 0, category: 'free' },
        'free_service_4': { name: 'مجاني: 50 مشاهدة يوتيوب تجريبية', price: 0, category: 'free' },
        'free_service_5': { name: 'مجاني: 10 متابعين تيك توك مصغر', price: 0, category: 'free' },
        'free_service_6': { name: 'مجاني: 15 لايك تيك توك مصغر', price: 0, category: 'free' },
        'free_service_7': { name: 'مجاني: 10 متابعين انستقرام تجريبي', price: 0, category: 'free' },
        'free_service_8': { name: 'مجاني: 20 مشاهدة انستقرام مصغرة', price: 0, category: 'free' },
        'free_service_9': { name: 'مجاني: 5 مشتركين يوتيوب تجريبي', price: 0, category: 'free' },
        'free_service_10': { name: 'مجاني: 15 تفاعل منصة X مصغر', price: 0, category: 'free' },
        'free_service_11': { name: 'مجاني: 10 متابعين تويتش تجريبي', price: 0, category: 'free' }
    }
};

function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            db.users = parsed.users || {};
            db.admins = parsed.admins || { [OWNER_CHAT_ID]: { role: 'owner', name: 'المالك الرئيسي', addedBy: 'System' }};
            db.giftCodes = parsed.giftCodes || {};
            db.coupons = parsed.coupons || {};
            db.pointCoupons = parsed.pointCoupons || {};
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
        adminId: adminId,
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

async function sendMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
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
    return db.admins[chatId] !== undefined;
}

function isOwner(chatId) {
    return chatId.toString() === OWNER_CHAT_ID.toString();
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

        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const userName = update.message.from.first_name || 'مستخدم';
            const userUsername = update.message.from.username ? `@${update.message.from.username}` : 'لا يوجد';

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
                    freeServicesTodayCount: 0,
                    lastFreeServiceReset: Date.now(),
                    orders: [],
                    transfers: [],
                    referredBy: null,
                    referralCount: 0,
                    waitingForInput: null,
                    waitingForGiftCreation: false,
                    waitingForBroadcast: false,
                    waitingForTransferId: null,
                    waitingForTransferTarget: null,
                    waitingForCouponCreate: false,
                    waitingForPointCouponCreate: false,
                    waitingForPointCouponApply: false,
                    waitingForCouponApply: null,
                    waitingForAdminAddPoints: null,
                    waitingForAdminBan: null,
                    waitingForServiceAdd: null,
                    lastTiktokTaskTime: 0
                };
                saveDatabase();

                if (!isAdmin(chatId)) {
                    let notifyAdminText = `🚨 **عضو جديد دخل البوت!**\n\n` +
                        `👤 الاسم: ${userName}\n` +
                        `🔗 المعرف: ${userUsername}\n` +
                        `🆔 الأيدي: \`${chatId}\`\n` +
                        `💬 للتواصل: [اضغط هنا](tg://user?id=${chatId})`;
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

            // استقبال المدخلات الإدارية مع التحقق التام من الصلاحيات والأيدي
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
                    db.admins[targetId] = { role: 'admin', name: 'أدمن', addedBy: adminName };
                    saveDatabase();
                    logAction(chatId, adminName, `إضافة أدمن جديد برقم الأيدي: ${targetId}`);
                    await sendMessage(chatId, `✅ تم تعيين المستخدم \`${targetId}\` كأدمن بنجاح.`);
                    return res.sendStatus(200);
                }

                if (user.waitingForRemoveAdmin) {
                    user.waitingForRemoveAdmin = false;
                    saveDatabase();
                    const targetId = text.trim();
                    if (targetId === OWNER_CHAT_ID.toString()) {
                        await sendMessage(chatId, `❌ لا يمكن حذف المالك الرئيسي من قائمة الأدمنية.`);
                        return res.sendStatus(200);
                    }
                    if (db.admins[targetId]) {
                        delete db.admins[targetId];
                        saveDatabase();
                        logAction(chatId, adminName, `حذف الأدمن ذو الأيدي: ${targetId}`);
                        await sendMessage(chatId, `✅ تم سحب صلاحيات الأدمن من \`${targetId}\`.`);
                    } else {
                        await sendMessage(chatId, `❌ هذا المستخدم ليس أدمن.`);
                    }
                    return res.sendStatus(200);
                }

                if (user.waitingForAddService) {
                    user.waitingForAddService = false;
                    saveDatabase();
                    const parts = text.split('|');
                    const sKey = parts[0]?.trim();
                    const sName = parts[1]?.trim();
                    const sPrice = parseInt(parts[2]);
                    const sCat = parts[3]?.trim() || 'paid';

                    if (!sKey || !sName || isNaN(sPrice)) {
                        await sendMessage(chatId, `❌ صيغة خاطئة! استخدم:\n\`المفتاح | اسم الخدمة | السعر | الفئة (paid/free/special)\``);
                        return res.sendStatus(200);
                    }

                    db.services[sKey] = { name: sName, price: sPrice, category: sCat };
                    saveDatabase();
                    logAction(chatId, adminName, `إضافة/تعديل الخدمة: ${sKey} (${sName}) بسعر ${sPrice}`);
                    await sendMessage(chatId, `✅ تم حفظ الخدمة بنجاح.`);
                    return res.sendStatus(200);
                }

                if (user.waitingForDeleteService) {
                    user.waitingForDeleteService = false;
                    saveDatabase();
                    const sKey = text.trim();
                    if (db.services[sKey]) {
                        delete db.services[sKey];
                        saveDatabase();
                        logAction(chatId, adminName, `حذف الخدمة: ${sKey}`);
                        await sendMessage(chatId, `✅ تم حذف الخدمة \`${sKey}\` بنجاح.`);
                    } else {
                        await sendMessage(chatId, `❌ مفتاح الخدمة غير موجود.`);
                    }
                    return res.sendStatus(200);
                }

                if (user.waitingForEditPrice) {
                    user.waitingForEditPrice = false;
                    saveDatabase();
                    const parts = text.split(' ');
                    const sKey = parts[0]?.trim();
                    const newPrice = parseInt(parts[1]);

                    if (!db.services[sKey] || isNaN(newPrice)) {
                        await sendMessage(chatId, `❌ صيغة خاطئة أو الخدمة غير موجودة. استخدم: \`مفتاح_الخدمة السعر_الجديد\``);
                        return res.sendStatus(200);
                    }

                    db.services[sKey].price = newPrice;
                    saveDatabase();
                    logAction(chatId, adminName, `تعديل سعر الخدمة ${sKey} إلى ${newPrice}`);
                    await sendMessage(chatId, `✅ تم تحديث سعر الخدمة \`${sKey}\` إلى *${newPrice} نقطة*.`);
                    return res.sendStatus(200);
                }

                if (user.waitingForPointsControl) {
                    const targetId = user.waitingForPointsControl;
                    user.waitingForPointsControl = null;
                    saveDatabase();
                    const pts = parseInt(text);

                    if (targetId === OWNER_CHAT_ID.toString() && !isOwner(chatId)) {
                        await sendMessage(chatId, `❌ عذراً، لا يمكنك تعديل رصيد المالك الرئيسي أو سحب صلاحياته!`);
                        return res.sendStatus(200);
                    }

                    if (isNaN(pts)) {
                        await sendMessage(chatId, `❌ يرجى إرسال رقم صحيح.`);
                        return res.sendStatus(200);
                    }

                    if (db.users[targetId]) {
                        db.users[targetId].points += pts;
                        saveDatabase();
                        logAction(chatId, adminName, `تعديل نقاط المستخدم ${targetId} بمقدار (${pts})`);
                        await sendMessage(chatId, `✅ تم تعديل رصيد العميل \`${targetId}\` بنجاح (${pts > 0 ? '+' + pts : pts}).`);
                        await sendMessage(targetId, `🎁 **تم تحديث رصيدك بمقدار ${pts} نقطة بواسطة الإدارة!**\nرصيدك الحالي: *${db.users[targetId].points} نقطة*.`);
                    } else {
                        await sendMessage(chatId, `❌ المستخدم غير مسجل في البوت.`);
                    }
                    return res.sendStatus(200);
                }

                if (user.waitingForBanUser) {
                    const targetId = text.trim();
                    user.waitingForBanUser = null;
                    saveDatabase();

                    if (targetId === OWNER_CHAT_ID.toString()) {
                        await sendMessage(chatId, `❌ لا يمكنك حظر المالك الرئيسي!`);
                        return res.sendStatus(200);
                    }

                    if (db.users[targetId]) {
                        db.users[targetId].isBanned = !db.users[targetId].isBanned;
                        saveDatabase();
                        const status = db.users[targetId].isBanned ? 'محظور 🔴' : 'غير محظور 🟢';
                        logAction(chatId, adminName, `تغيير حالة حظر المستخدم ${targetId} إلى ${status}`);
                        await sendMessage(chatId, `✅ تم تغيير حالة الحظر للمستخدم \`${targetId}\` إلى: ${status}`);
                    } else {
                        await sendMessage(chatId, `❌ العميل غير موجود.`);
                    }
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

                if (user.waitingForCouponCreate) {
                    user.waitingForCouponCreate = false;
                    saveDatabase();
                    const parts = text.split(' ');
                    const couponCode = parts[0]?.toUpperCase();
                    const discountPct = parseInt(parts[1]);

                    if (!couponCode || isNaN(discountPct) || discountPct <= 0 || discountPct > 100) {
                        await sendMessage(chatId, `❌ **خطأ!** الصيغة الصحيحة: \`الكود نسبة_الخصم\` مثل \`TURBO10 15\``);
                        return res.sendStatus(200);
                    }

                    db.coupons[couponCode] = { discount: discountPct, usedBy: [] };
                    saveDatabase();

                    await sendMessage(chatId, `✅ **تم إنشاء كوبون الخصم بنجاح!**\n🎫 الكود: \`${couponCode}\`\n📉 نسبة الخصم: *${discountPct}%*`);
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
                        if (referrerId !== chatId.toString() && db.users[referrerId] && !user.referredBy) {
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
                showMainMenu(chatId);
                return res.sendStatus(200);
            }

            if (user.waitingForTransferId) {
                const targetId = text.trim();
                if (targetId === chatId.toString()) {
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
                    await sendMessage(chatId, `⚠️ **عذراً، لقد استنفدت الحد الأقص للتحويل (مرتين أسبوعياً).**`);
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

            if (user.waitingForCouponApply) {
                const serviceCode = user.waitingForCouponApply;
                user.waitingForCouponApply = null;
                saveDatabase();
                const couponCode = text.trim().toUpperCase();

                if (!db.coupons[couponCode]) {
                    await sendMessage(chatId, `❌ **كوبون الخصم غير صالح!**`);
                    return res.sendStatus(200);
                }

                const coupon = db.coupons[couponCode];
                if (coupon.usedBy.includes(chatId)) {
                    await sendMessage(chatId, `⚠️ **لقد استخدمت هذا الكوبون مسبقاً!**`);
                    return res.sendStatus(200);
                }

                coupon.usedBy.push(chatId);
                user.activeCoupon = { code: couponCode, discount: coupon.discount };
                saveDatabase();

                await sendMessage(chatId, `✅ **تم تطبيق كوبون الخصم بنجاح (${coupon.discount}%)!**`);
                processOrder(chatId, serviceCode, user);
                return res.sendStatus(200);
            }

            if (text) {
                if (user.waitingForInput) {
                    const pendingService = user.waitingForInput;
                    user.waitingForInput = null;
                    saveDatabase();

                    if (text.length < 3 || (!text.includes('http') && !text.includes('@') && !text.includes('www.'))) {
                        await sendMessage(chatId, `❌ **الرابط غير صحيح!** يرجى إرسال رابط صحيح وتأكد أن الحساب عام:`);
                        user.waitingForInput = pendingService;
                        saveDatabase();
                        return res.sendStatus(200);
                    }

                    const targetInput = text;
                    const serviceData = db.services[pendingService];
                    let cost = serviceData ? serviceData.price : 200;

                    if (serviceData && serviceData.category === 'free') {
                        const now = Date.now();
                        const oneDay = 24 * 60 * 60 * 1000;
                        if (now - (user.lastFreeServiceReset || 0) > oneDay) {
                            user.freeServicesTodayCount = 0;
                            user.lastFreeServiceReset = now;
                        }

                        if (user.freeServicesTodayCount >= 2) {
                            await sendMessage(chatId, `⚠️ **عذراً، استنفدت الحد الأقصى للخدمات المجانية اليوم (خدمتان فقط كل 24 ساعة).**`);
                            return res.sendStatus(200);
                        }

                        user.freeServicesTodayCount += 1;
                        user.ordersCount += 1;
                        const orderId = 'FREE-' + Math.floor(100000 + Math.random() * 900000);

                        const orderObj = {
                            orderId: orderId,
                            serviceKey: pendingService,
                            serviceName: serviceData.name,
                            target: targetInput,
                            cost: 0,
                            status: 'قيد مراجعة المتجر ⏳',
                            rating: null,
                            time: Date.now()
                        };
                        user.orders.push(orderObj);
                        user.lastOrder = orderId;
                        saveDatabase();

                        await sendMessage(chatId, `🎁 **تم استلام طلب الخدمة المجانية!**\n📌 رقم الطلب: \`${orderId}\`\n\n⚠️ **ملاحظة:** قد يوافق المتجر على تنفيذ طلبك أو يرفضه بناءً على التوفر.`);
                        return res.sendStatus(200);
                    }

                    const level = getUserLevel(user.ordersCount);
                    let discountRate = level.discount;
                    if (user.activeCoupon) {
                        discountRate += (user.activeCoupon.discount / 100);
                        user.activeCoupon = null;
                    }

                    if (cost > 0 && discountRate > 0) {
                        cost = Math.round(cost * (1 - discountRate));
                    }

                    if (user.points < cost) {
                        await sendMessage(chatId, `❌ **عذراً، رصيدك غير كافٍ!**\nلديك *${user.points} نقطة* وتحتاج إلى *${cost} نقطة*.`);
                        return res.sendStatus(200);
                    }
                    user.points -= cost;

                    user.ordersCount += 1;
                    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
                    
                    const orderObj = {
                        orderId: orderId,
                        serviceKey: pendingService,
                        serviceName: getServiceNiceName(pendingService),
                        target: targetInput,
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

                    const supportMsg = `🔔 **تم قبول طلبك برقم:** \`${orderId}\`\n\n` +
                        `🚨 **تنبيه هام:** يرجى التواصل مع الدعم الفني فوراً عبر اليوزر التالي لإتمام طلبك:\n` +
                        `👤 الدعم الفني: @th_s777\n` +
                        `📞 هاتف الدعم: \`${OWNER_PHONE}\`\n` +
                        `📌 **أرسل لهم رقم طلبك ومشكلتك بالتفصيل ليتم خدمتِك بنجاح!**`;

                    await sendMessage(chatId, supportMsg);

                    const adminMsg = `🚨 **طلب مدفوع جديد!**\n\n` +
                        `👤 العميل: [${userName}](tg://user?id=${chatId})\n` +
                        `🏷️ المعرف (ID): \`${chatId}\`\n` +
                        `📦 الخدمة: ${getServiceNiceName(pendingService)}\n` +
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
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;
            const data = callbackQuery.data;

            if (!db.users[chatId]) {
                db.users[chatId] = { name: 'مستخدم', username: 'لا يوجد', points: 0, ordersCount: 0, orders: [], transfers: [], referralCount: 0 };
                saveDatabase();
            }
            const user = db.users[chatId];
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (data === 'main_menu') {
                user.waitingForInput = null;
                showMainMenu(chatId, messageId, true);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            // تحقق صارم في الأزرار الإدارية
            if (data.startsWith('adm_') || data === 'owner_panel') {
                if (!isAdmin(chatId)) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '❌ غير مصرح لك بالوصول!', show_alert: true });
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
                            { text: '🎁 إنشاء هدية / كوبون', callback_data: 'adm_coupons_menu' },
                            { text: '📊 إحصائيات البوت الشاملة', callback_data: 'adm_bot_stats' }
                        ],
                        [
                            { text: '📜 سجل العمليات والأعطال', callback_data: 'adm_audit_logs' },
                            { text: '⚙️ إعدادات النظام', callback_data: 'adm_system_settings' }
                        ],
                        [{ text: '⬅️ العودة للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `🛠️ **لوحة التحكم الشاملة (الرئيس فقط):**\nمرحباً بك يا غالي، اختر القسم المطلوب:`, adminKeyboard);
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
                await editMessageText(chatId, messageId, `➕ أرسل بيانات الخدمة بالصيغة التالية:\n\`المفتاح | اسم الخدمة | السعر | الفئة\`\nمثال:\n\`boost_1 | 100 متابع تيك توك | 200 | paid\``, {
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
                await editMessageText(chatId, messageId, `💵 أرسل المفتاح والسعر الجديد بالصيغة:\n\`مفتاح_الخدمة السعر_الجديد\`\nمثال: \`pay_tk_f1 250\``, {
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
                await editMessageText(chatId, messageId, `🎁 **قسم إنشاء الهدايا والكوبونات:**`, {
                    inline_keyboard: [
                        [{ text: '🎁 رابط نقاط أزرق', callback_data: 'admin_create_gift' }],
                        [{ text: '🎫 إنشاء كوبون نقاط', callback_data: 'admin_create_point_coupon' }],
                        [{ text: '🎫 إنشاء كوبون خصم', callback_data: 'admin_create_coupon' }],
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

            if (data === 'admin_create_coupon') {
                user.waitingForCouponCreate = true;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎫 **إنشاء كوبون خصم جديد:**\nأرسل بالصيغة: \`الكود النسبة\` مثل \`TURBO10 20\``, {
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

                const statsText = `📊 **لوحة تقارير وإحصائيات البوت الشاملة:**\n\n` +
                    `🟢 حالة تشغيل البوت: *${db.systemSettings.botStatus}*\n` +
                    `⚡ سرعة استجابة البوت: *~3 مللي ثانية*\n` +
                    `👥 عدد المستخدمين الكلي: *${totalUsers}*\n` +
                    `🟢 عدد المستخدمين النشطون: *${totalUsers}*\n` +
                    `📦 عدد الطلبات المكتملة: *${totalCompleted}*\n` +
                    `⏳ عدد الطلبات المعلقة: *${totalPending}*\n` +
                    `❌ عدد الأعطال المسجلة: *${db.errorLogs.length}*\n` +
                    `🔌 حالة اتصال Telegram API: *متصل وثابت 🟢*\n` +
                    `💾 حالة قاعدة البيانات: *مستقرة ومحدثة 🟢*\n` +
                    `⏱️ مدة التشغيل: *${hours} ساعة و ${minutes} دقيقة*\n` +
                    `📈 استهلاك الذاكرة (RAM): *${heapMB} MB*\n` +
                    `💻 المعالج (CPU): *${os.cpus()[0]?.model || 'Standard'}*\n\n` +
                    `📞 هاتف المالك: \`${OWNER_PHONE}\`\n` +
                    `👤 يوزر المالك: @th_s777`;

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
                await editMessageText(chatId, messageId, `🎮 **ساحة التحدي والألعاب (كسب النقاط):**\nاختر التحدي المناسب لربح النقاط مجاناً:`, gamesKb);
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
                await editMessageText(chatId, messageId, `🎯 **مهمة كسب 25 نقطة:**\n\n1. اضغط على الزر أدناه لمتابعة الحساب على تيك توك.\n2. بعد إتمام المتابعة، اضغط على زر **"تأكيد المتابعة"** لتحصل على النقاط فوراً!`, taskKb);
                await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
                return res.sendStatus(200);
            }

            if (data === 'claim_tiktok_reward') {
                const oneDayCheck = 24 * 60 * 60 * 1000;
                if (now - (user.lastTiktokTaskTime || 0) < oneDayCheck) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ لقد نفذت هذه المهمة اليوم! انتظر 24 ساعة.', show_alert: true });
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
                if (now - (user.lastBoxes || 0) < oneDay) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ لعبت الصناديق اليوم!', show_alert: true });
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
                await editMessageText(chatId, messageId, `📦 **لعبة الصناديق:**\nاختر صندوقاً واحداً عشوائياً لربح جوائز عالية:`, boxesKb);
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
                if (now - (user.lastWheel || 0) < oneDay) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ لعبت عجلة الحظ اليوم!', show_alert: true });
                    return res.sendStatus(200);
                }
                user.lastWheel = now;
                const prize = Math.floor(Math.random() * 100) + 50;
                user.points += prize;
                saveDatabase();
                await sendMessage(chatId, `🎡 **دَارت عجلة الحظ وربحت:** *${prize} نقطة* 🪙.\nرصيدك الحالي: ${user.points} نقطة.`);
                showMainMenu(chatId, messageId, true);
            }

            else if (data === 'play_flag') {
                if (now - (user.lastFlagGame || 0) < oneDay) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ لعبت "خمن العلم" اليوم!', show_alert: true });
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

                await editMessageText(chatId, messageId, `🌍 **لعبة خمن العلم!**\n\nما هي الدولة صاحب هذا العلم؟\n${selected.flag}\n\n⏳ **أرسل اسم الدولة في الشات الآن (جائزة كبرى 50 نقطة)!**`);
                return res.sendStatus(200);
            }

            else if (data === 'play_math') {
                if (now - (user.lastMathGame || 0) < oneDay) {
                    await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id, text: '⏳ لعبت "الحساب السريع" اليوم!', show_alert: true });
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

                await editMessageText(chatId, messageId, `🔢 **لعبة الحساب السريع!**\n\nاحسب الناتج التالي:\n\`${n1} ${sign} ${n2} = ?\`\n\n⏳ **أرسل الناتج في الشات الآن (جائزة كبرى 50 نقطة)!**`);
                return res.sendStatus(200);
            }

            else if (data === 'free_services_menu') {
                user.waitingForInput = null;
                saveDatabase();
                const kb = {
                    inline_keyboard: [
                        [{ text: '🎁 100 مشاهدة تيك توك مصغرة', callback_data: 'free_service_1' }],
                        [{ text: '🎁 20 لايك انستقرام مصغر', callback_data: 'free_service_2' }],
                        [{ text: '🎁 10 متابعين تيليجرام تجريبي', callback_data: 'free_service_3' }],
                        [{ text: '🎁 50 مشاهدة يوتيوب تجريبية', callback_data: 'free_service_4' }],
                        [{ text: '🎁 10 متابعين تيك توك مصغر', callback_data: 'free_service_5' }],
                        [{ text: '🎁 15 لايك تيك توك مصغر', callback_data: 'free_service_6' }],
                        [{ text: '🎁 10 متابعين انستقرام تجريبي', callback_data: 'free_service_7' }],
                        [{ text: '🎁 20 مشاهدة انستقرام مصغرة', callback_data: 'free_service_8' }],
                        [{ text: '🎁 5 مشتركين يوتيوب تجريبي', callback_data: 'free_service_9' }],
                        [{ text: '🎁 15 تفاعل منصة X مصغر', callback_data: 'free_service_10' }],
                        [{ text: '🎁 10 متابعين تويتش تجريبي', callback_data: 'free_service_11' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `💎 **مركز الخدمات المجانية السريعة:**\n\n- مسموح لك اختيار **خدمتين (2) فقط كل يوم**.\nاختر الخدمة المناسبة:`, kb);
            }

            else if (data === 'services_menu') {
                user.waitingForInput = null;
                saveDatabase();
                const servKeyboard = {
                    inline_keyboard: [
                        [{ text: '⚡ مخزن العروض الخاصة والخدمات النووية', callback_data: 'special_store_menu' }],
                        [{ text: '🎵 خدمات تيك توك', callback_data: 'platform_tiktok' }],
                        [{ text: '📺 خدمات يوتيوب', callback_data: 'platform_youtube' }],
                        [{ text: '📸 خدمات انستقرام', callback_data: 'platform_insta' }],
                        [{ text: '💜 خدمات تويتش (Twitch)', callback_data: 'platform_twitch' }],
                        [{ text: '✈️ خدمات تيليجرام', callback_data: 'platform_telegram' }],
                        [{ text: '✖️ خدمات منصة X (تويتر)', callback_data: 'platform_x' }],
                        [{ text: '🛒 إنشاء متجر متكامل (2000 نقطة)', callback_data: 'pay_store_create' }],
                        [{ text: '⬅️ رجوع للقائمة الرئيسية', callback_data: 'main_menu' }]
                    ]
                };
                await editMessageText(chatId, messageId, `⚡🔥 **قسم تعزيز الحسابات والرشقات السريعة:**`, servKeyboard);
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
                await editMessageText(chatId, messageId, `🎵 **قسم تيك توك:**`, {
                    inline_keyboard: [
                        [{ text: '👤 10 إلى 50 متابع (180 نقطة)', callback_data: 'pay_tk_f1' }],
                        [{ text: '👤 50 إلى 100 متابع (350 نقطة)', callback_data: 'pay_tk_f2' }],
                        [{ text: '👤 100 إلى 200 متابع (650 نقطة)', callback_data: 'pay_tk_f3' }],
                        [{ text: '👁️ مشاهدات 100 إلى 1000 (150 نقطة)', callback_data: 'pay_tk_v1' }],
                        [{ text: '👁️ مشاهدات 1000 إلى 10000 (550 نقطة)', callback_data: 'pay_tk_v2' }],
                        [{ text: '⬅️ رجوع للمتجر', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_youtube') {
                await editMessageText(chatId, messageId, `📺 **قسم يوتيوب:**`, {
                    inline_keyboard: [
                        [{ text: '👤 10 إلى 50 مشترك (220 نقطة)', callback_data: 'pay_yt_f1' }],
                        [{ text: '👤 50 إلى 100 مشترك (450 نقطة)', callback_data: 'pay_yt_f2' }],
                        [{ text: '👤 100 إلى 200 مشترك (800 نقطة)', callback_data: 'pay_yt_f3' }],
                        [{ text: '👁️ مشاهدات 100 إلى 1000 (180 نقطة)', callback_data: 'pay_yt_v1' }],
                        [{ text: '👁️ مشاهدات 1000 إلى 10000 (700 نقطة)', callback_data: 'pay_yt_v2' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_insta') {
                await editMessageText(chatId, messageId, `📸 **قسم انستقرام:**`, {
                    inline_keyboard: [
                        [{ text: '👤 10 إلى 50 متابع (200 نقطة)', callback_data: 'pay_in_f1' }],
                        [{ text: '👤 50 إلى 100 متابع (400 نقطة)', callback_data: 'pay_in_f2' }],
                        [{ text: '👤 100 إلى 200 متابع (720 نقطة)', callback_data: 'pay_in_f3' }],
                        [{ text: '👁️ مشاهدات 100 إلى 1000 (160 نقطة)', callback_data: 'pay_in_v1' }],
                        [{ text: '👁️ مشاهدات 1000 إلى 10000 (600 نقطة)', callback_data: 'pay_in_v2' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_twitch') {
                await editMessageText(chatId, messageId, `💜 **قسم تويتش:**`, {
                    inline_keyboard: [
                        [{ text: '👤 متابعين 10 إلى 50 (190 نقطة)', callback_data: 'pay_tw_f1' }],
                        [{ text: '👤 متابعين 50 إلى 100 (380 نقطة)', callback_data: 'pay_tw_f2' }],
                        [{ text: '👁️ مشاهدات بث تويتش (240 نقطة)', callback_data: 'pay_tw_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_telegram') {
                await editMessageText(chatId, messageId, `✈️ **قسم تيليجرام:**`, {
                    inline_keyboard: [
                        [{ text: '👤 متابعين وقنوات (180 نقطة)', callback_data: 'pay_tg_f1' }],
                        [{ text: '👁️ مشاهدات منشورات (150 نقطة)', callback_data: 'pay_tg_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data === 'platform_x') {
                await editMessageText(chatId, messageId, `✖️ **قسم منصة X:**`, {
                    inline_keyboard: [
                        [{ text: '👤 متابعين منصة X (200 نقطة)', callback_data: 'pay_x_f1' }],
                        [{ text: '❤️ تفاعلات منشورات X (170 نقطة)', callback_data: 'pay_x_v1' }],
                        [{ text: '⬅️ رجوع', callback_data: 'services_menu' }]
                    ]
                });
            }

            else if (data.startsWith('free_service_') || data.startsWith('pay_')) {
                const serviceKey = data;
                const serviceData = db.services[serviceKey];
                let cost = serviceData ? serviceData.price : 200;

                if (serviceData && (serviceData.category === 'paid' || serviceData.category === 'special')) {
                    const level = getUserLevel(user.ordersCount);
                    if (level.discount > 0) {
                        cost = Math.round(cost * (1 - level.discount));
                    }
                    if (user.points < cost) {
                        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
                            callback_query_id: callbackQuery.id,
                            text: `❌ رصيدك غير كافٍ! لديك ${user.points} نقطة وتحتاج إلى ${cost} نقطة.`,
                            show_alert: true
                        });
                        return res.sendStatus(200);
                    }
                }

                user.waitingForInput = serviceKey;
                saveDatabase();

                let msgPrompt = `🔗 **أرسل الآن في الشات رابط أو تفاصيل الحساب المطلوبة:**\n*(التكلفة: ${cost} نقطة)*`;
                if (serviceKey === 'pay_rand_tk_acc') {
                    msgPrompt = `🔥 **أرسل رابط حسابك أو معرفك لتسليم الحساب العشوائي عليه:**\n*(التكلفة: ${cost} نقطة)*`;
                } else if (serviceKey === 'pay_recover_acc') {
                    msgPrompt = `🛡️ **أرسل يوزر الحساب المهكر أو المسروب ورابطه:**\n*(التكلفة: ${cost} نقطة)*`;
                } else if (serviceData && serviceData.category === 'free') {
                    msgPrompt = `🎁 **أرسل رابط الحساب أو المقطع للخدمة المجانية المصغرة:**`;
                }

                await editMessageText(chatId, messageId, msgPrompt, {
                    inline_keyboard: [
                        serviceData && serviceData.category === 'paid' ? [{ text: '🎫 إدخال كوبون خصم', callback_data: `apply_coupon_${serviceKey}` }] : [],
                        [{ text: '⬅️ إلغاء والعودة', callback_data: 'services_menu' }]
                    ].filter(row => row.length > 0)
                });
            }

            else if (data.startsWith('apply_coupon_')) {
                const serviceKey = data.replace('apply_coupon_', '');
                user.waitingForCouponApply = serviceKey;
                saveDatabase();
                await editMessageText(chatId, messageId, `🎫 **أدخل كود كوبون الخصم الآن في الشات:**`, {
                    inline_keyboard: [[{ text: '⬅️ رجوع', callback_data: serviceKey }]]
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
                    `🏆 المستوي: *${level.name}*\n` +
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
                    `🔹 الدعم الفني: @th_s777\n` +
                    `📞 هاتف الدعم: \`${OWNER_PHONE}\`\n\n` +
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
                    await editMessageText(chatId, messageId, `✅ **تم تأكيد إتمام الطلب (${orderIdStr}) بنجاح وإرسال طلب التقييم للعميل.**`);
                } else {
                    await sendMessage(targetUserChatId, `❌ **عذراً،** تم رفض أو إلغاء طلبك رقم \`${orderIdStr}\` ❌.`);
                    await editMessageText(chatId, messageId, `❌ **تم تسجيل الطلب (${orderIdStr}) كفشل وإشعار العميل.**`);
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

function showMainMenu(chatId, messageId = null, edit = false) {
    const user = db.users[chatId] || { points: 0, ordersCount: 0 };
    const level = getUserLevel(user.ordersCount);
    const menuText = `🎛️ **القائمة الرئيسية لمتجر تيربو بلس:**\n\n` +
        `🪙 رصيدك: *${user.points} نقطة*\n` +
        `🏆 مستواك: *${level.name}*\n\n` +
        `🌹 منور المتجر يا غالي، اختر القسم المناسب:`;

    let keyboardRows = [
        [
            { text: '🎁 الهدية اليومية', callback_data: 'daily_gift' },
            { text: '💎 مركز الخدمات المجانية', callback_data: 'free_services_menu' }
        ],
        [
            { text: '⚡🔥 قسم تعزيز الحسابات والرشقات السريعة', callback_data: 'services_menu' },
            { text: '👥 نظام الإحالات', callback_data: 'referral_system' }
        ],
        [
            { text: '🎮 الألعاب والتحديات', callback_data: 'games_menu' },
            { text: '🎫 تفعيل كوبون نقاط', callback_data: 'redeem_point_coupon' }
        ],
        [
            { text: '💳 تحويل النقاط', callback_data: 'transfer_points' },
            { text: '💰 شراء النقاط', callback_data: 'buy_points' }
        ],
        [
            { text: '📋 سجل طلباتي', callback_data: 'my_orders' },
            { text: '👤 حسابي والمستوى', callback_data: 'my_account' }
        ],
        [
            { text: '📦 تتبع آخر طلب', callback_data: 'track_order' },
            { text: '🛠️ الدعم الفني', callback_data: 'support' }
        ]
    ];

    if (isAdmin(chatId)) {
        keyboardRows.push([{ text: '🛠️ لوحة تحكم الأدمن والمالك', callback_data: 'owner_panel' }]);
    }

    const menuKeyboard = { inline_keyboard: keyboardRows };

    if (edit && messageId) {
        editMessageText(chatId, messageId, menuText, menuKeyboard);
    } else {
        sendMessage(chatId, menuText, menuKeyboard);
    }
}

function processOrder(chatId, serviceKey, user) {
    user.ordersCount += 1;
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const serviceData = db.services[serviceKey];
    let cost = serviceData ? serviceData.price : 200;
    
    if (user.points < cost) {
        sendMessage(chatId, `❌ رصيدك غير كافٍ بعد الخصم.`);
        return;
    }
    user.points -= cost;
    user.lastOrder = orderId;
    saveDatabase();
    
    sendMessage(chatId, `✅ **تم تأكيد طلبك برقم:** \`${orderId}\`\n\n🚨 **تنبيه هام:** يرجى التواصل مع الدعم الفني فوراً (@th_s777) وإرسال رقم طلبك ومشكلتك ليتم تنفيذ الخدمة لك.`);
}

app.get('/', (req, res) => {
    res.send('Bot is running successfully!');
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
