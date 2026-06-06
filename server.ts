import express from 'express';
import path from 'node:path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.disable('x-powered-by');

// Sanitize user inputs for safe logging to prevent log injection (CWE-117)
function sanitizeLog(val: any): string {
  if (val === undefined || val === null) return '';
  const str = typeof val === 'string' ? val : String(val);
  return str.replace(/[\r\n]/g, '_');
}

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory registry of verification codes
interface PendingUser {
  fullName: string;
  password: string;
  code: string;
  expiresAt: number;
}

const pendingUsers = new Map<string, PendingUser>();

interface PasswordReset {
  code: string;
  expiresAt: number;
}

const passwordResetCodes = new Map<string, PasswordReset>();

// Configure Nodemailer Transporter lazily
function getMailTransporter() {
  try {
    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT.trim(), 10) : 587;
    const secure = process.env.SMTP_SECURE?.trim() === 'true';
    const user = process.env.SMTP_USER?.trim();
    let pass = process.env.SMTP_PASS?.trim();

    // If using Gmail SMTP, clean the app password by removing any visual spaces (e.g., "aaaa bbbb cccc dddd" -> "aaaabbbbccccdddd")
    if (host.toLowerCase().includes('gmail.com') && pass) {
      pass = pass.replace(/\s+/g, '');
    }

    if (!user || !pass) {
      console.warn('[SMTP WARNING] SMTP_USER or SMTP_PASS missing. Falling back to email simulation mode.');
      return null;
    }

    console.log(`[SMTP Diagnostic] Creating transporter with properties:
      HOST: "${host}"
      PORT: ${port}
      SECURE: ${secure}
      USER: "${user}"
      PASS: ${pass ? '••••••••' + pass.slice(-4) : 'MISSING'}
    `);

    return nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout: 4000, // 4 seconds timeout on connection
      greetingTimeout: 4000,   // 4 seconds timeout on SMTP greeting
      socketTimeout: 4000,     // 4 seconds timeout on inactivity
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,  // Automatically logs all SMTP handshake lines
      logger: true  // Outputs communication to the node console log
    });
  } catch (err: any) {
    console.warn('[SMTP Config Error] Failed to create transporter:', err.message);
    return null;
  }
}

const SMTP_FROM = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"L'Étoile" <${process.env.SMTP_USER.trim()}>` : "\"L'Étoile\" <no-reply@letoile.com>");

// API 1: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API 2: Send verification email
app.post('/api/auth/send-verification', async (req, res) => {
  const { email, fullName, password } = req.body;

  if (!email || !fullName || !password) {
    return res.status(400).json({ error: 'من فضلك أرسل جميع الخصائص المطلوبة للتحقق.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate a random high-quality 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins expiry

  pendingUsers.set(normalizedEmail, {
    fullName,
    password,
    code,
    expiresAt,
  });

  const emailSubject = `🔑 رمز التحقق الفاخر الخاص بك - مطعم L'Étoile`;
  
  // Beautiful HTML verification email
  const htmlContent = `
    <div style="background-color: #050505; color: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px 20px; direction: rtl; text-align: right;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #0b0b0c; border: 1px solid rgba(255,107,0,0.15); border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        
        <!-- Header / Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; line-height: 60px; background: linear-gradient(135deg, #FF6B00 0%, #FF9D00 100%); border-radius: 12px; color: #ffffff; font-size: 20px; font-weight: 900; box-shadow: 0 4px 20px rgba(255,107,0,0.4);">
            LUX
          </div>
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin-top: 15px; margin-bottom: 5px; letter-spacing: 1px;">L'ÉTOILE</h1>
          <p style="color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 0;">Haute Cuisine & Gourmet Experience</p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 25px 0;" />
        
        <!-- Main body -->
        <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin-bottom: 15px;">مرحباً بك يا ${fullName} في عالم النخبة،</h2>
        
        <p style="color: #d1d1d6; font-size: 13.5px; line-height: 1.7; margin-bottom: 30px;">
          نشكرك على الانضمام إلى عائلة كبار ذواقة مطعم <strong>L'Étoile</strong>. لإتمام عملية تفعيل حسابك والتحقق من بريدك الإلكتروني بأمان، يرجى استخدام رمز التحقق الفاخر التالي:
        </p>
        
        <!-- Verification code container -->
        <div style="background-color: rgba(255,107,0,0.04); border: 1px dashed rgba(255,107,0,0.3); border-radius: 14px; padding: 25px 15px; text-align: center; margin-bottom: 30px;">
          <small style="color: #FF6B00; font-size: 11px; font-weight: bold; display: block; margin-bottom: 8px; letter-spacing: 1.5px;">رمز التحقق الذكي (صالح لمدة 15 دقيقة)</small>
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 8px; text-shadow: 0 0 10px rgba(255,107,0,0.3);">${code}</span>
        </div>
        
        <p style="color: rgba(255,255,255,0.5); font-size: 11.5px; line-height: 1.5;">
          * إذا لم تقم بطلب هذا الرمز، فيرجى تجاهل هذا البريد الإلكتروني. لا تشارك هذا الرمز مع أي شخص لضمان حماية بياناتك الطهوية وحسابك الشخصي.
        </p>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
        
        <!-- Signature Footer -->
        <div style="text-align: center;">
          <p style="color: #FF6B00; font-size: 12px; font-weight: bold; margin: 0 0 5px 0;">قسم الجودة والتحقق الفاخر</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0;">&copy; ${new Date().getFullYear()} L'Étoile Paris-Riyadh. جميع الحقوق محفوظة.</p>
        </div>
        
      </div>
    </div>
  `;

  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(500).json({ 
        error: 'إعدادات البريد (SMTP_USER / SMTP_PASS) غير مكتملة في الخادوم. يرجى تهيئتها في الإعدادات.' 
      });
    }
    await transporter.sendMail({
      from: SMTP_FROM,
      to: normalizedEmail,
      subject: emailSubject,
      html: htmlContent,
    });
    console.log(`[Email Verified] Sent real verification code [${sanitizeLog(code)}] successfully to ${sanitizeLog(normalizedEmail)}`);
    return res.json({ success: true, message: 'تم إرسال كود التحقق بنجاح لبريدك الإلكتروني الحقيقي!' });
  } catch (e: any) {
    console.error('SMTP Real-time error occurred during verification mail send:', e.message);
    return res.status(500).json({
      error: `فشل مخدّم الـ SMTP في إرسال كود التحقق الفعلي. الخطأ: ${e.message}. يرجى التحقق من صحة البريد وكلمة المرور الخاصة بالتطبيق وإعدادات الهوست SMTP_HOST وحفظها.`
    });
  }
});

// API 3: Verify the input code
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'من فضلك أرسل البريد الإلكتروني والرمز معاً.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const pending = pendingUsers.get(normalizedEmail);

  if (!pending) {
    return res.status(404).json({ error: 'لم يتم العثور على طلب تفعيل ساري المفعول لهذا الحساب، أعد التسجيل مجدداً.' });
  }

  if (Date.now() > pending.expiresAt) {
    pendingUsers.delete(normalizedEmail);
    return res.status(400).json({ error: 'انتهت صلاحية رمز التحقق، يرجى المحاولة وطلب رمز جديد.' });
  }

  if (pending.code !== code.trim()) {
    return res.status(400).json({ error: 'رمز التحقق المدخل غير صحيح! يرجى التحقق مرة أخرى من بريدك.' });
  }

  // Clear pending verification state on success
  pendingUsers.delete(normalizedEmail);

  return res.json({
    success: true,
    message: 'تم التحقق من بريدك بنجاح وإنشاء الحساب في النظام البنيوي للمطعم!',
    user: {
      username: normalizedEmail,
      name: pending.fullName,
      role: 'customer'
    }
  });
});

// API 3.1: Request password reset code
app.post('/api/auth/reset-password-request', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'من فضلك أدخل البريد الإلكتروني للمتابعة.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  passwordResetCodes.set(normalizedEmail, { code, expiresAt });

  const emailSubject = `🔐 رمز إعادة تعيين كلمة المرور - مطعم L'Étoile`;
  
  const htmlContent = `
    <div style="background-color: #050505; color: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px 20px; direction: rtl; text-align: right;">
      <div style="max-width: 550px; margin: 0 auto; background-color: #0b0b0c; border: 1px solid rgba(255,107,0,0.18); border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.65);">
        
        <!-- Header / Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; line-height: 60px; background: linear-gradient(135deg, #FF6B00 0%, #FF9D00 100%); border-radius: 12px; color: #ffffff; font-size: 20px; font-weight: 900; box-shadow: 0 4px 20px rgba(255,107,0,0.45);">
            SEC
          </div>
          <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin-top: 15px; margin-bottom: 5px; letter-spacing: 1px;">أمان L'ÉTOILE</h1>
          <p style="color: #FF6B00; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 0; font-weight: bold;">PRESTIGE SECURITY SERVICES</p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 25px 0;" />
        
        <!-- Main body -->
        <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin-bottom: 15px;">استعادة أمان حسابك،</h2>
        
        <p style="color: #d1d1d6; font-size: 13.5px; line-height: 1.7; margin-bottom: 30px;">
          لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك الفاخر لدى مطعم <strong>L'Étoile</strong>. يرجى استخدام الرمز السري الفعّال المرفق أدناه لإكمال الإجراء بأمان:
        </p>
        
        <!-- Verification code container -->
        <div style="background-color: rgba(255,107,0,0.04); border: 1px dashed rgba(255,107,0,0.3); border-radius: 14px; padding: 25px 15px; text-align: center; margin-bottom: 30px;">
          <small style="color: #FF6B00; font-size: 11px; font-weight: bold; display: block; margin-bottom: 8px; letter-spacing: 1.5px;">رمز الاستلام المؤقت (صالح لمدة 10 دقائق)</small>
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; color: #ffffff; letter-spacing: 8px; text-shadow: 0 0 10px rgba(255,107,0,0.3);">${code}</span>
        </div>
        
        <p style="color: rgba(255,255,255,0.45); font-size: 11.5px; line-height: 1.6;">
          🔒 لضمان سرية حسابك ومعلوماتك، نرجو عدم مشاركة هذا الرمز على الإطلاق مع أي طرف آخر. إذا لم تقم بطلب إعادة تعيين كلمة المرور بنفسك، يمكنك تجاهل هذه الرسالة والمحافظة على أرقامك دون قلق.
        </p>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
        
        <!-- Signature Footer -->
        <div style="text-align: center;">
          <p style="color: #FF6B00; font-size: 12px; font-weight: bold; margin: 0 0 5px 0;">قسم الأمان والتحكم بالشبكات</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0;">&copy; ${new Date().getFullYear()} L'Étoile Paris-Riyadh. جميع الحقوق محفوظة.</p>
        </div>
        
      </div>
    </div>
  `;

  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(500).json({ 
        error: 'إعدادات البريد (SMTP_USER / SMTP_PASS) غير مكتملة في الخادوم لتهيئة استعادة الحساب.' 
      });
    }
    await transporter.sendMail({
      from: SMTP_FROM,
      to: normalizedEmail,
      subject: emailSubject,
      html: htmlContent,
    });
    console.log(`[Reset Password Request] Sent verification code [${sanitizeLog(code)}] safely to ${sanitizeLog(normalizedEmail)}`);
    return res.json({ success: true, message: 'تم إرسال كود استعادة الحساب إلى بريدك الإلكتروني بنجاح!' });
  } catch (e: any) {
    console.error('SMTP Reset code mailer failed:', e.message);
    return res.status(500).json({
      error: `فشل مخدّم الـ SMTP في إرسال رمز استعادة كلمة المرور الفعلي. الخطأ: ${e.message}. يرجى التحقق من صحة معلومات SMTP في إعدادات البيئة.`
    });
  }
});

// API 3.2: Verify password reset code
app.post('/api/auth/verify-reset-code', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'من فضلك أدخل البريد الإلكتروني والرمز للتحقق.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const resetInfo = passwordResetCodes.get(normalizedEmail);

  if (!resetInfo) {
    return res.status(404).json({ error: 'لم يتم العثور على طلب إعادة تعيين نشط أو ساري لهذا الحساب.' });
  }

  if (Date.now() > resetInfo.expiresAt) {
    passwordResetCodes.delete(normalizedEmail);
    return res.status(400).json({ error: 'انتهت صلاحية الرمز، نرجو إعادة إرسال طلب جديد للحصول على رمز بديل.' });
  }

  if (resetInfo.code !== code.trim()) {
    return res.status(400).json({ error: 'رمز التحقق غير صحيح. يرجى مراجعة بريدك وإعادة المحاولة.' });
  }

  return res.json({
    success: true,
    message: 'تم تأكيد هويتك ومصادقة الرمز بنجاح! تفضل بتعيين كلمة المرور الجديدة الآن.'
  });
});

// API 3.5: Send order on the way (transit) notification
app.post('/api/orders/notify-transit', async (req, res) => {
  const { order } = req.body;

  if (!order?.id) {
    return res.status(400).json({ error: 'يرجى تزويد معلومات الطلب كاملة.' });
  }

  const emailTo = order.customerEmail || process.env.SMTP_USER; // fallback to mail system user if order lacks email

  if (!emailTo) {
    console.warn(`[Transit Email System] No recipient email specified for order ${sanitizeLog(order?.id)}`);
    return res.json({ success: true, message: 'Simulated OK (no email provided)' });
  }

  const emailSubject = `✨ سحر الطهي في الطريق إليك! طلبك رقم ${order.id} قيد التوصيل الآن`;

  const paymentLabel = order.paymentMethod === 'Card' ? 'بواسطة البطاقة البنكية الإلكترونية' : 'الدفع نقداً عند التوصيل';
  
  // Create beautiful luxury HTML table of food items
  const itemsRows = order.items.map((it: any) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 12px 0; color: #ffffff; font-size: 13px; font-weight: 500; text-align: right;">${it.name}</td>
      <td style="padding: 12px 10px; color: rgba(255,255,255,0.6); font-size: 13px; text-align: center;">${it.quantity}x</td>
      <td style="padding: 12px 0; color: #FF6B00; font-size: 13px; font-weight: bold; text-align: left;">$${(it.price * it.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="background-color: #050505; color: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px 20px; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #0b0b0c; border: 1px solid rgba(255,107,0,0.18); border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.65);">
        
        <!-- Header / Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; line-height: 60px; background: linear-gradient(135deg, #FF6B00 0%, #FF9D00 100%); border-radius: 12px; color: #ffffff; font-size: 18px; font-weight: 900; box-shadow: 0 4px 20px rgba(255,107,0,0.35);">
            TRANS
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin-top: 15px; margin-bottom: 5px;">عذوبة المذاق تقترب منك!</h1>
          <p style="color: #FF6B00; font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; margin: 0; font-weight: bold;">L'ÉTOILE HAUTE CUISINE ON THE WAY</p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 25px 0;" />
        
        <!-- Main Info -->
        <p style="color: #ffffff; font-size: 15px; font-weight: bold; margin-bottom: 15px;">عزيزنا العميل الفاخر، ${order.customerName}</p>
        <p style="color: #d1d1d6; font-size: 13px; line-height: 1.7; margin-bottom: 25px;">
          يسعدنا أن نخبرك بأن أطباقك الفاخرة قد غادرت مطبخنا النابض بالحياة الآن بعد أن تم إعدادها وكيّها بأعلى معايير الدقة والجمال. إنها الآن في طريقها إليك ساخنة ومغلقة بإحكام متناهٍ مع سائقنا المخصص لتصلك بأزهى صورة طهوية ممكنة.
        </p>

        <!-- Transit details -->
        <div style="background-color: rgba(255,107,0,0.04); border: 1px solid rgba(255,107,0,0.15); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span><strong>معرّف الطلب المخملي:</strong></span>
            <span style="font-family: monospace; color: #FF6B00; font-weight: bold; font-size: 13px;">${order.id}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px;">
            <strong>وجهة التوصيل الفاخرة:</strong> <span style="color: #ffffff;">${order.address}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px;">
            <strong>رقم هاتف التسليم:</strong> <span style="color: #ffffff;" style="font-family: monospace;">${order.phone}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55);">
            <strong>طريقة الدفع المسجلة:</strong> <span style="color: #ffffff;">${paymentLabel}</span>
          </div>
        </div>

        <!-- Order Items Title -->
        <h3 style="font-size: 14px; font-weight: bold; color: #ffffff; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">الأطباق الفاخرة التي تحملها عربة السفر</h3>
        
        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 11px; text-align: right;">الاسم</th>
              <th style="padding: 8px 10px; color: rgba(255,255,255,0.4); font-size: 11px; text-align: center; width: 40px;">الكمية</th>
              <th style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 11px; text-align: left; width: 60px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Grand Total Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; background-color: rgba(255,107,0,0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,107,0,0.1); margin-bottom: 30px;">
          <span style="font-size: 13px; font-weight: bold; color: #ffffff;">المجموع الإجمالي:</span>
          <span style="font-size: 18px; font-weight: 950; color: #FF6B00;">$${order.total.toFixed(2)}</span>
        </div>

        <p style="color: #d1d1d6; font-size: 12.5px; text-align: center; margin-bottom: 25px; line-height: 1.6;">
          الرجاء إبقاء هاتفك قريباً لتسهيل تواصل مندوب الرفاهية لدينا معك بمجرد وصوله إلى عتبة دارك.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.APP_URL || 'https://letoilebite.com'}" style="display: inline-block; background-color: #FF6B00; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 12px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(255,107,0,0.3); transition: all 0.3s;">
            عرض ومتابعة حالة الطلب في خريطتك
          </a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
        
        <!-- Signature Footer -->
        <div style="text-align: center;">
          <p style="color: #FF6B00; font-size: 12px; font-weight: bold; margin: 0 0 5px 0;">قسم النقل والوجبات السريعة الفاخرة</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0;">&copy; ${new Date().getFullYear()} L'Étoile Delivery System. جميع الحقوق محفوظة.</p>
        </div>
        
      </div>
    </div>
  `;

  const transporter = getMailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: emailTo,
        subject: emailSubject,
        html: htmlContent,
      });
      console.log(`[Order Transit Email] Success: Sent status notification email for order ${sanitizeLog(order?.id)} directly to ${sanitizeLog(emailTo)}`);
      return res.json({ success: true, message: 'Email sent successfully via SMTP' });
    } catch (e: any) {
      console.error('SMTP Mail error occurred on transit notification:', e.message);
      return res.json({ success: true, simulated: true, errorHint: e.message });
    }
  } else {
    // Beautiful simulation logger
    console.log('\n' + '='.repeat(60));
    console.log(`✨ [SIMULATED EMAIL TRANSIT] SIMULATING TRANSIT STATUS EMAIL`);
    console.log(`   To: ${sanitizeLog(emailTo)}`);
    console.log(`   Order Ref: ${sanitizeLog(order?.id)}`);
    console.log(`   Subject: ${sanitizeLog(emailSubject)}`);
    console.log(`   Content preview: Order ${sanitizeLog(order?.id)} is now on the way to ${sanitizeLog(order?.address)}`);
    console.log('='.repeat(60) + '\n');

    return res.json({
      success: true,
      simulated: true,
      message: 'Email transit simulated in console logs (no SMTP parameters configured).'
    });
  }
});

// API 4: Send order delivered notification
app.post('/api/orders/notify-delivery', async (req, res) => {
  const { order } = req.body;

  if (!order?.id) {
    return res.status(400).json({ error: 'يرجى تزويد معلومات الطلب كاملة.' });
  }

  const emailTo = order.customerEmail || process.env.SMTP_USER; // fallback to mail system user if order lacks email

  if (!emailTo) {
    console.warn(`[Delivery Email System] No recipient email specified for order ${sanitizeLog(order?.id)}`);
    return res.json({ success: true, message: 'Simulated OK (no email provided)' });
  }

  const emailSubject = `🛵 تم تسليم طلبك الفاخر بنجاح! رقم الطلبية ${order.id}`;

  const paymentLabel = order.paymentMethod === 'Card' ? 'بواسطة البطاقة البنكية الإلكترونية' : 'الدفع نقداً عند التوصيل';
  
  // Create beautiful luxury HTML table of food items
  const itemsRows = order.items.map((it: any) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 12px 0; color: #ffffff; font-size: 13px; font-weight: 500; text-align: right;">${it.name}</td>
      <td style="padding: 12px 10px; color: rgba(255,255,255,0.6); font-size: 13px; text-align: center;">${it.quantity}x</td>
      <td style="padding: 12px 0; color: #FF6B00; font-size: 13px; font-weight: bold; text-align: left;">$${(it.price * it.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="background-color: #050505; color: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px 20px; direction: rtl; text-align: right;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #0b0b0c; border: 1px solid rgba(52,211,153,0.18); border-radius: 20px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.65);">
        
        <!-- Header / Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 60px; height: 60px; line-height: 60px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 12px; color: #ffffff; font-size: 20px; font-weight: 900; box-shadow: 0 4px 20px rgba(16,185,129,0.35);">
            DELV
          </div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin-top: 15px; margin-bottom: 5px;">تم توصيل طلبك بنجاح!</h1>
          <p style="color: #10B981; font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; margin: 0; font-weight: bold;">L'ÉTOILE DELIVERY SERVICE</p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 25px 0;" />
        
        <!-- Main Info -->
        <p style="color: #ffffff; font-size: 15px; font-weight: bold; margin-bottom: 15px;">عزيزنا العميل الفاخر، ${order.customerName}</p>
        <p style="color: #d1d1d6; font-size: 13px; line-height: 1.7; margin-bottom: 25px;">
          يسرنا إبلاغك بأن وجبتك الفاخرة قد تم تسليمها من قبل طاقم التوصيل الخاص بنا للبيت بنجاح وهي الآن في عهدتك الراقية لتستلذ بكل تفاصيل طهوها المخملية.
        </p>

        <!-- Delivery Card details -->
        <div style="background-color: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.15); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span><strong>رقم الطلبية المخملي:</strong></span>
            <span style="font-family: monospace; color: #10B981; font-weight: bold; font-size: 13px;">${order.id}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px;">
            <strong>موقع التوصيل الفاخر:</strong> <span style="color: #ffffff;">${order.address}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 12px;">
            <strong>رقم هاتف الاتصال:</strong> <span style="color: #ffffff;" style="font-family: monospace;">${order.phone}</span>
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.55);">
            <strong>طريقة السداد:</strong> <span style="color: #ffffff;">${paymentLabel}</span>
          </div>
        </div>

        <!-- Order Items Title -->
        <h3 style="font-size: 14px; font-weight: bold; color: #ffffff; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">موجز الفاتورة والوجبات الفاخرة</h3>
        
        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 11px; text-align: right;">الاسم</th>
              <th style="padding: 8px 10px; color: rgba(255,255,255,0.4); font-size: 11px; text-align: center; width: 40px;">الكمية</th>
              <th style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 11px; text-align: left; width: 60px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Grand Total Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; background-color: rgba(255,107,0,0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,107,0,0.1); margin-bottom: 30px;">
          <span style="font-size: 13px; font-weight: bold; color: #ffffff;">المجموع الإجمالي المشحون:</span>
          <span style="font-size: 18px; font-weight: 950; color: #FF6B00;">$${order.total.toFixed(2)}</span>
        </div>

        <p style="color: #d1d1d6; font-size: 12.5px; text-align: center; margin-bottom: 25px; line-height: 1.6;">
          نتمنى أن تكون قد حظيت بتجربة راقية وفريدة. يسعدنا للغاية أن تشاركنا تقييمك للأطباق عبر الصفحة الرئيسية لتسجيل آرائك الثمينة!
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.APP_URL || 'https://letoilebite.com'}" style="display: inline-block; background-color: #FF6B00; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 12px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(255,107,0,0.3); transition: all 0.3s;">
            تقييم الطلب الفاخر ومتابعة الطهو
          </a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 30px 0;" />
        
        <!-- Signature Footer -->
        <div style="text-align: center;">
          <p style="color: #10B981; font-size: 12px; font-weight: bold; margin: 0 0 5px 0;">قسم النقل والوجبات السريعة الفاخرة</p>
          <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0;">&copy; ${new Date().getFullYear()} L'Étoile Delivery System. جميع الحقوق محفوظة.</p>
        </div>
        
      </div>
    </div>
  `;

  const transporter = getMailTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: emailTo,
        subject: emailSubject,
        html: htmlContent,
      });
      console.log(`[Order Delivered Email] Success: Sent status notification email for order ${sanitizeLog(order?.id)} directly to ${sanitizeLog(emailTo)}`);
      return res.json({ success: true, message: 'Email sent successfully via SMTP' });
    } catch (e: any) {
      console.error('SMTP Mail error occurred on delivery notification:', e.message);
      return res.json({ success: true, simulated: true, errorHint: e.message });
    }
  } else {
    // Beautiful simulation logger
    console.log('\n' + '='.repeat(60));
    console.log(`✨ [SIMULATED EMAIL DELIVERY] SIMULATING DELIVERY STATUS EMAIL`);
    console.log(`   To: ${sanitizeLog(emailTo)}`);
    console.log(`   Order Ref: ${sanitizeLog(order?.id)}`);
    console.log(`   Subject: ${sanitizeLog(emailSubject)}`);
    console.log(`   Content preview: Successful delivery of ${sanitizeLog(order?.items?.length)} dishes for a total of $${sanitizeLog(order?.total?.toFixed(2))}`);
    console.log('='.repeat(60) + '\n');

    return res.json({
      success: true,
      simulated: true,
      message: 'Email delivery simulated in console logs (no SMTP parameters configured).'
    });
  }
});

// Vite middleware and listener bootstrap
async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[L'Étoile Full-Stack Server] running dynamically on http://localhost:${PORT}`);
  });
}

(async () => {
  try {
    await bootstrap();
  } catch (err) {
    console.error('[Bootstrap Error] Failed to start full-stack server:', err);
  }
})();
