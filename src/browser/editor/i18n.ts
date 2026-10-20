// Editor strings. English is the source; Arabic is a full translation of the UI (right-to-left layout follows). Add a language: add a column.
type Dict = Record<string, string>;
const en: Dict = {
  'app.title': 'Seekframe Editor', 'skip': 'Skip to the controls',
  'tab.scenes': 'Scenes', 'tab.style': 'Style', 'tab.variants': 'Variants', 'tab.brand': 'Brand', 'tab.audio': 'Audio', 'tab.export': 'Export',
  'film': 'Film', 'version': 'Version', 'saveAs': 'Save as…', 'delete': 'Delete', 'resetAll': 'Reset all', 'history': 'History', 'undo': 'Undo', 'redo': 'Redo',
  'newFilm': 'New film', 'setup': 'Setup', 'shortcuts': 'Shortcuts', 'theme': 'Theme', 'language': 'Language',
  'saved': 'Saved', 'unsaved': 'Unsaved…', 'saveFailed': 'Save failed', 'loading': 'Loading film…',
  'frame': 'frame', 'play': 'Play', 'pause': 'Pause', 'timeline': 'Timeline', 'safeArea': 'Safe area', 'checkText': 'Check text', 'size': 'Size',
  'hint.keys': 'space play · ←/→ frame · shift ±1 s · [ ] scene · ctrl+z undo · ? help', 'hint.drag': 'Drag a scene’s right edge to change its length',
  'scenes.note': 'Reorder, duplicate or remove scenes, change their length (the animation is stretched or squeezed to fit) and edit what each one contains.',
  'scene.length': 'Length', 'scene.trim': 'Trim (which part of the scene plays)', 'scene.start': 'Start', 'scene.end': 'End', 'scene.copy': 'copy', 'scene.speed': 'speed',
  'scene.noOptions': 'No editable options in this scene.', 'scene.shared': 'Text and style values are shared with the other copies of this scene.',
  'scene.up': 'Move earlier', 'scene.down': 'Move later', 'scene.dup': 'Duplicate', 'scene.del': 'Remove',
  'style.note': 'Options that apply to the whole film.', 'style.none': 'This film has no global style options. Scene-specific options are in the Scenes tab.',
  'variants.note': 'Pick a look. “Apply” copies its options into this version; saved versions open in place.', 'variants.none': 'This film declares no variants yet. Add manifest.variants.presets, or use “Save as…” to keep named versions.',
  'audio.style': 'Sound style', 'audio.theme': 'Theme', 'audio.loud': 'loudness',
  'audio.note': 'Timeline-synced tracks are cut and sped up or slowed down together with each scene. “Free” tracks (music, uploads) just play from the start of the film.',
  'audio.add': 'Add audio file…', 'audio.volume': 'Volume', 'audio.sync': 'Sync', 'audio.offset': 'Offset', 'audio.generated': 'Generated from the film’s cues',
  'audio.follows': 'Follows the scenes', 'audio.free': 'Free (plays from start)', 'audio.wave': 'Waveform on the timeline',
  'export.project': 'Project file', 'export.projectNote': 'The whole film in one file: scenes, brand kit, saved versions and uploaded images. Send it to someone, or open it on another computer.', 'export.pack': 'Export project', 'export.import': 'Import project…', 'export.imported': 'Imported “{id}”', 'export.restart': 'The editor server is an older version without project export. Stop it (Ctrl+C in its terminal) and start it again.', 'export.exists': '“{id}” already exists. Type a new name, or leave it to replace the existing film:', 'export.fps': 'Frame rate', 'export.fps30': '30 fps (draft)', 'export.fps60': '60 fps (final)', 'export.fps24': '24 fps', 'export.add': 'Add to render queue', 'export.queue': 'Render queue',
  'export.output': 'Output', 'export.notify': 'Notify me when a render finishes', 'export.empty': 'Nothing rendered yet.', 'export.cancel': 'Cancel', 'export.eta': 'about {s} s left', 'export.download': 'Download',
  'brand.note': 'Your brand kit: films use these colours, fonts and logo. Everything here can also be done from the terminal (seekframe brand …).',
  'brand.name': 'Brand name', 'brand.tagline': 'Tagline', 'brand.tone': 'Voice and tone', 'brand.logo': 'Logo', 'brand.logoHelp': 'Drop a PNG, JPG or SVG. We trace it to a clean SVG, extract strokes you can animate, and suggest colours.',
  'brand.upload': 'Choose logo…', 'brand.drop': 'Drop your logo here', 'brand.colors': 'Colours', 'brand.suggested': 'Use suggested colours', 'brand.contrast': 'Contrast (WCAG)', 'brand.fonts': 'Fonts',
  'brand.fontFile': 'Font file', 'brand.family': 'Family name', 'brand.weight': 'Weight', 'brand.license': 'Licence', 'brand.addFont': 'Add font', 'brand.apply': 'Apply brand to this film',
  'brand.applied': 'Brand applied to this film', 'brand.none': 'No brand kit yet. Add a logo or set a name to create one.', 'brand.fallback': 'Bundled fallback fonts (Inter, IBM Plex Sans Arabic) are used for anything not covered.',
  'brand.stray': 'Strokes extracted: review the preview and remove stray ones in brand/assets/logo-strokes.json.',
  'lic.OFL': 'Open licence (OFL): can be shared', 'lic.free-no-redistribute': 'Free to use, may not be redistributed', 'lic.commercial-no-redistribute': 'Commercial licence, may not be redistributed', 'lic.unknown': 'Not sure',
  'lic.warn': 'Fonts that may not be redistributed are kept out of git (added to .gitignore).',
  'wizard.title': 'New film', 'wizard.name': 'Name', 'wizard.format': 'Format', 'wizard.create': 'Create film', 'wizard.cancel': 'Cancel', 'wizard.brand': 'Start from my brand kit', 'wizard.nobrand': 'No brand kit yet: new films start with the default colours and fonts.', 'wizard.setbrand': 'Set up brand',
  'setup.title': 'Setup check', 'setup.ok': 'Everything needed to make films is ready.', 'setup.fix': 'Fix the items marked ✗ then check again.', 'setup.recheck': 'Check again', 'setup.close': 'Close',
  'keys.title': 'Keyboard shortcuts', 'check.title': 'Text check', 'check.none': 'No text leaves the frame.', 'check.scan': 'Scan every scene', 'check.issue': 'leaves the frame by {px}px',
  'history.title': 'Version history', 'history.restore': 'Restore', 'history.none': 'No earlier snapshots yet.', 'history.changed': 'Changed', 'history.same': 'identical to now',
  'confirm.reset': 'Discard all edits in this version (text, style, scenes, audio)?', 'confirm.delete': 'Delete this version?', 'prompt.name': 'Name for this version:',
  'close': 'Close', 'copy': 'Copy', 'light': 'Light', 'dark': 'Dark', 'auto': 'Auto',
};
const ar: Dict = {
  'app.title': 'محرر Seekframe', 'skip': 'انتقل إلى عناصر التحكم',
  'tab.scenes': 'المشاهد', 'tab.style': 'النمط', 'tab.variants': 'النسخ', 'tab.brand': 'الهوية', 'tab.audio': 'الصوت', 'tab.export': 'التصدير',
  'film': 'الفيلم', 'version': 'النسخة', 'saveAs': 'حفظ باسم…', 'delete': 'حذف', 'resetAll': 'إعادة الضبط', 'history': 'السجل', 'undo': 'تراجع', 'redo': 'إعادة',
  'newFilm': 'فيلم جديد', 'setup': 'الإعداد', 'shortcuts': 'الاختصارات', 'theme': 'المظهر', 'language': 'اللغة',
  'saved': 'تم الحفظ', 'unsaved': 'غير محفوظ…', 'saveFailed': 'تعذّر الحفظ', 'loading': 'جارٍ تحميل الفيلم…',
  'frame': 'إطار', 'play': 'تشغيل', 'pause': 'إيقاف مؤقت', 'timeline': 'الخط الزمني', 'safeArea': 'المنطقة الآمنة', 'checkText': 'فحص النص', 'size': 'المقاس',
  'hint.keys': 'مسافة: تشغيل · ←/→ إطار · shift ثانية · [ ] مشهد · ctrl+z تراجع · ? مساعدة', 'hint.drag': 'اسحب الحافة اليمنى للمشهد لتغيير مدته',
  'scenes.note': 'أعد ترتيب المشاهد أو كرّرها أو احذفها، وغيّر مدتها (تُمدَّد الحركة أو تُضغط لتناسبها)، وعدّل محتوى كل مشهد.',
  'scene.length': 'المدة', 'scene.trim': 'اقتطاع (أي جزء من المشهد يُعرض)', 'scene.start': 'البداية', 'scene.end': 'النهاية', 'scene.copy': 'نسخة', 'scene.speed': 'السرعة',
  'scene.noOptions': 'لا توجد خيارات قابلة للتعديل في هذا المشهد.', 'scene.shared': 'قيم النص والنمط مشتركة مع النسخ الأخرى من هذا المشهد.',
  'scene.up': 'قبل', 'scene.down': 'بعد', 'scene.dup': 'تكرار', 'scene.del': 'إزالة',
  'style.note': 'خيارات تنطبق على الفيلم كله.', 'style.none': 'لا يحتوي هذا الفيلم على خيارات نمط عامة. خيارات كل مشهد في تبويب المشاهد.',
  'variants.note': 'اختر شكلاً. «تطبيق» ينسخ خياراته إلى هذه النسخة، والنسخ المحفوظة تُفتح مباشرة.', 'variants.none': 'لم يعرّف هذا الفيلم نسخاً بعد. أضف manifest.variants.presets أو استخدم «حفظ باسم…».',
  'audio.style': 'أسلوب الصوت', 'audio.theme': 'الطابع', 'audio.loud': 'الجهارة',
  'audio.note': 'المسارات المرتبطة بالخط الزمني تُقصّ وتُسرَّع أو تُبطَّأ مع كل مشهد. المسارات «الحرة» (موسيقى، ملفات مرفوعة) تعمل من بداية الفيلم.',
  'audio.add': 'إضافة ملف صوتي…', 'audio.volume': 'مستوى الصوت', 'audio.sync': 'الارتباط', 'audio.offset': 'الإزاحة', 'audio.generated': 'مُولَّد من إشارات الفيلم',
  'audio.follows': 'يتبع المشاهد', 'audio.free': 'حر (من البداية)', 'audio.wave': 'الموجة الصوتية على الخط الزمني',
  'export.project': 'ملف المشروع', 'export.projectNote': 'الفيلم كاملاً في ملف واحد: المشاهد وهوية العلامة والنسخ المحفوظة والصور المرفوعة. أرسله لغيرك أو افتحه على جهاز آخر.', 'export.pack': 'تصدير المشروع', 'export.import': 'استيراد مشروع…', 'export.imported': 'تم استيراد «{id}»', 'export.restart': 'خادم المحرر نسخة أقدم بلا تصدير المشروع. أوقفه (Ctrl+C في نافذته) وشغّله من جديد.', 'export.exists': '«{id}» موجود بالفعل. اكتب اسماً جديداً، أو اتركه كما هو لاستبدال الفيلم الحالي:', 'export.fps': 'معدل الإطارات', 'export.fps30': '30 إطاراً/ث (مسودة)', 'export.fps60': '60 إطاراً/ث (نهائي)', 'export.fps24': '24 إطاراً/ث', 'export.add': 'إضافة إلى قائمة التصيير', 'export.queue': 'قائمة التصيير',
  'export.output': 'الملف الناتج', 'export.notify': 'أبلغني عند انتهاء التصيير', 'export.empty': 'لم يُصيَّر شيء بعد.', 'export.cancel': 'إلغاء', 'export.eta': 'متبقٍ نحو {s} ث', 'export.download': 'تنزيل',
  'brand.note': 'هوية علامتك: تستخدم الأفلام هذه الألوان والخطوط والشعار. كل ما هنا متاح أيضاً من الطرفية (seekframe brand …).',
  'brand.name': 'اسم العلامة', 'brand.tagline': 'الشعار اللفظي', 'brand.tone': 'نبرة الصوت', 'brand.logo': 'الشعار', 'brand.logoHelp': 'أفلت ملف PNG أو JPG أو SVG. نحوّله إلى SVG نظيف ونستخرج خطوطاً قابلة للتحريك ونقترح الألوان.',
  'brand.upload': 'اختيار الشعار…', 'brand.drop': 'أفلت الشعار هنا', 'brand.colors': 'الألوان', 'brand.suggested': 'استخدام الألوان المقترحة', 'brand.contrast': 'التباين (WCAG)', 'brand.fonts': 'الخطوط',
  'brand.fontFile': 'ملف الخط', 'brand.family': 'اسم العائلة', 'brand.weight': 'الوزن', 'brand.license': 'الترخيص', 'brand.addFont': 'إضافة الخط', 'brand.apply': 'تطبيق الهوية على هذا الفيلم',
  'brand.applied': 'تم تطبيق الهوية على هذا الفيلم', 'brand.none': 'لا توجد هوية بعد. أضف شعاراً أو اسماً لإنشائها.', 'brand.fallback': 'تُستخدم خطوط احتياطية مضمّنة (Inter وIBM Plex Sans Arabic) لأي نص لا يغطيه خطك.',
  'brand.stray': 'تم استخراج الخطوط: راجع المعاينة واحذف الخطوط الزائدة من brand/assets/logo-strokes.json.',
  'lic.OFL': 'ترخيص مفتوح (OFL): يمكن مشاركته', 'lic.free-no-redistribute': 'مجاني للاستخدام، لا يجوز إعادة توزيعه', 'lic.commercial-no-redistribute': 'ترخيص تجاري، لا يجوز إعادة توزيعه', 'lic.unknown': 'لست متأكداً',
  'lic.warn': 'الخطوط التي لا يجوز إعادة توزيعها تُستبعد من git (تُضاف إلى .gitignore).',
  'wizard.title': 'فيلم جديد', 'wizard.name': 'الاسم', 'wizard.format': 'الصيغة', 'wizard.create': 'إنشاء الفيلم', 'wizard.cancel': 'إلغاء', 'wizard.brand': 'ابدأ من هويتي', 'wizard.nobrand': 'لا توجد هوية بعد: ستبدأ الأفلام بالألوان والخطوط الافتراضية.', 'wizard.setbrand': 'إعداد الهوية',
  'setup.title': 'فحص الإعداد', 'setup.ok': 'كل ما يلزم لصناعة الأفلام جاهز.', 'setup.fix': 'أصلح العناصر المعلّمة بـ ✗ ثم افحص مجدداً.', 'setup.recheck': 'افحص مجدداً', 'setup.close': 'إغلاق',
  'keys.title': 'اختصارات لوحة المفاتيح', 'check.title': 'فحص النص', 'check.none': 'لا يوجد نص يخرج عن الإطار.', 'check.scan': 'افحص كل المشاهد', 'check.issue': 'يخرج عن الإطار بمقدار {px} بكسل',
  'history.title': 'سجل النسخ', 'history.restore': 'استعادة', 'history.none': 'لا توجد لقطات سابقة بعد.', 'history.changed': 'تغيّر', 'history.same': 'مطابقة للحالية',
  'confirm.reset': 'تجاهل كل التعديلات في هذه النسخة (النص والنمط والمشاهد والصوت)؟', 'confirm.delete': 'حذف هذه النسخة؟', 'prompt.name': 'اسم هذه النسخة:',
  'close': 'إغلاق', 'copy': 'نسخ', 'light': 'فاتح', 'dark': 'داكن', 'auto': 'تلقائي',
};
const dicts: Record<string, Dict> = { en, ar };
export const LANGS = [{ id: 'en', label: 'English' }, { id: 'ar', label: 'العربية' }];
let current = 'en';
try { current = localStorage.getItem('sf-lang') || ((navigator.language || 'en').startsWith('ar') ? 'ar' : 'en'); } catch { /* storage may be blocked */ }
if (!dicts[current]) current = 'en';
export const lang = () => current;
export const isRTL = () => current === 'ar';
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
export function setLang(l: string): void { if (!dicts[l]) return; current = l; try { localStorage.setItem('sf-lang', l); } catch { /* ignore */ } applyDirection(); }
export function applyDirection(): void { document.documentElement.lang = current; document.documentElement.dir = isRTL() ? 'rtl' : 'ltr'; document.title = t('app.title'); }
/** fill every [data-i18n] / [data-i18n-title] / [data-i18n-aria] element under root */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle!); });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.i18nAria!)); });
}
