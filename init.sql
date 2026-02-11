-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    hashed_password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS guides (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    image_url VARCHAR(255),
    priority INTEGER DEFAULT 0,
    help_options TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guide_steps (
    id SERIAL PRIMARY KEY,
    guide_id INTEGER REFERENCES guides(id) ON DELETE CASCADE,
    step_number INTEGER DEFAULT 1,
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS step_problems (
    id SERIAL PRIMARY KEY,
    guide_id INTEGER REFERENCES guides(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default users
INSERT INTO users (name, email, hashed_password, role) VALUES
('admin', 'admin@example', '$2b$12$ii1RHn2f4SDMStCUTPMwkuhFMz5r4iANz64fVFB2xlFwP5QIyrWsW', 'admin'),
('user', 'user@example', '$2b$12$DLJuSg161nzSnpxyiFNRbuU/RHx8yaZ5DW3/rLxbzZ2pCR2cyC1Da', 'user');

-- Seed default guides
INSERT INTO guides (id, title, content, status, image_url, priority) VALUES
(1, 'MHRS Randevu Alma', '', 'published', '/static/img/mhrs.png', 10),
(2, 'e-Devlet Şifresi Alma', '', 'published', '/static/img/edevlet.png', 9),
(3, 'Market Alışverişi', '', 'published', '/static/img/shopping.png', 8),
(4, 'WhatsApp Kullanımı', '', 'published', '/static/img/whatsapp.png', 7),
(5, 'e-Nabız Kullanımı', '', 'published', '/static/img/enabiz.png', 6),
(6, 'İnternetten Yemek Siparişi', '', 'published', '/static/img/yemek.png', 5);

-- Seed steps for guides
INSERT INTO guide_steps (guide_id, step_number, title, description, image_url) VALUES
-- MHRS (ID 1) - 8 Adım
(1, 1, 'Uygulamayı Başlatın', 'Telefonunuzdaki MHRS ikonuna dokunun veya tarayıcınızdan mhrs.gov.tr adresini açın.', '/static/img/ui_app_open.png'),
(1, 2, 'Giriş Yöntemi Seçin', 'E-Devlet ile Giriş seçeneğini kullanarak güvenli bağlantı sayfasına yönlenin.', '/static/img/ui_login.png'),
(1, 3, 'Kimlik Bilgileri', 'T.C. Kimlik numaranızı ve e-Devlet şifrenizi girerek sisteme dahil olun.', '/static/img/ui_login.png'),
(1, 4, 'Randevu Türü Seçimi', 'Aile Hekimi veya Hastane Randevusu seçeneklerinden size uygun olanı seçin.', '/static/img/ui_selection.png'),
(1, 5, 'Klinik Belirleme', 'Şikayetinize uygun branşı (Göz, Dahiliye, KBB vb.) listeden bulun.', '/static/img/ui_selection.png'),
(1, 6, 'Hekim ve Tarih Seçimi', 'Tercih ettiğiniz doktoru ve muayene olmak istediğiniz günü takvimden işaretleyin.', '/static/img/ui_calendar.png'),
(1, 7, 'Saat Dilimi Belirleme', 'Doktorun müsait olduğu saat dilimlerinden size en uygun olanı seçin.', '/static/img/ui_calendar.png'),
(1, 8, 'Onay ve Bildirim', 'Randevu detaylarını kontrol edip onaylayın; randevu bilgileriniz SMS olarak gelecektir.', '/static/img/ui_success.png'),

-- e-Devlet (ID 2) - 8 Adım
(2, 1, 'Kimlik Belgesi Hazırlığı', 'Üzerinde T.C. Kimlik numaranızın bulunduğu fotoğraflı bir kimlik kartını yanınıza alın.', '/static/img/ui_security.png'),
(2, 2, 'PTT Ziyareti', 'Size en yakın PTT merkezine giderek e-Devlet şifre başvurusu yapın.', '/static/img/ui_physical_visit.png'),
(2, 3, 'Zarfın Teslim Alınması', 'Görevli tarafından size verilen ve içerisinde geçici şifreniz bulunan kapalı zarfı alın.', '/static/img/ui_selection.png'),
(2, 4, 'Sisteme İlk Giriş', 'turkiye.gov.tr adresine girip "Giriş Yap" butonuna tıklayın.', '/static/img/ui_login.png'),
(2, 5, 'Geçici Şifreyi Yazın', 'PTTden aldığınız şifreyi ilgili kutucuğa dikkatlice yazın.', '/static/img/ui_login.png'),
(2, 6, 'Şifre Yenileme Ekranı', 'Sistem güvenlik gereği sizden şifrenizi hemen değiştirmenizi isteyecektir.', '/static/img/ui_security.png'),
(2, 7, 'Yeni Şifre Oluşturma', 'En az bir harf ve rakam içeren, unutmayacağınız güçlü bir şifre belirleyin.', '/static/img/ui_security.png'),
(2, 8, 'İşlem Başarılı', 'Artık e-Devlet kapısındaki binlerce hizmete yeni şifrenizle erişebilirsiniz.', '/static/img/ui_success.png'),

-- Market Alışverişi (ID 3) - 9 Adım
(3, 1, 'Market Uygulaması Seçimi', 'Market (A101, Migros vb.) uygulamasını telefonunuzdan açın.', '/static/img/ui_app_open.png'),
(3, 2, 'Adres Tanımlama', 'Ürünlerin teslim edileceği ev veya iş adresi bilgilerinizi kaydedin.', '/static/img/ui_selection.png'),
(3, 3, 'Kategorilere Göz Atın', 'Manav, Temizlik veya Gıda gibi kategoriler arasında gezinin.', '/static/img/ui_selection.png'),
(3, 4, 'Ürün Arama', 'Belli bir markayı veya ürünü bulmak için üstteki büyüteç simgesini kullanın.', '/static/img/ui_selection.png'),
(3, 5, 'Sepete Ekleme', 'Beğendiğiniz ürünlerin yanındaki artı (+) butonuna basarak sepete atın.', '/static/img/ui_selection.png'),
(3, 6, 'Gramaj ve Adet Kontrolü', 'Sepetinize giderek ürün miktarlarını son kez gözden geçirin.', '/static/img/ui_selection.png'),
(3, 7, 'Teslimat Aralığı', 'Marketin getirebileceği boş saat dilimlerinden birini seçin.', '/static/img/ui_calendar.png'),
(3, 8, 'Ödeme Yöntemi', 'Kredi kartı veya varsa kapıda ödeme seçeneğini işaretleyin.', '/static/img/ui_security.png'),
(3, 9, 'Siparişi Tamamla', 'Siparişiniz yola çıktığında telefonunuza bildirim gelecektir.', '/static/img/ui_success.png'),

-- WhatsApp Kullanımı (ID 4) - 9 Adım
(4, 1, 'Uygulamayı Kurun ve Açın', 'WhatsApp ikonuna basarak uygulamayı çalıştırın.', '/static/img/ui_app_open.png'),
(4, 2, 'Kişi Listesini Yenile', 'Sağ alttaki yeşil konuşma balonuna basarak rehberinizi görüntüleyin.', '/static/img/ui_selection.png'),
(4, 3, 'Sohbet Başlatma', 'Konuşmak istediğiniz kişinin ismine listeden dokunun.', '/static/img/ui_app_open.png'),
(4, 4, 'Mesaj Yazma Alanı', 'Klavyenin açılması için en alttaki beyaz boşluğa parmağınızla vurun.', '/static/img/ui_selection.png'),
(4, 5, 'Metin Gönderme', 'Mesajınızı yazdıktan sonra sağdaki yeşil ok tuşuna basın.', '/static/img/ui_success.png'),
(4, 6, 'Sesli Mesaj (Bas-Konuş)', 'Yazmak yerine mikrofon simgesine basılı tutarak sesinizi kaydedin.', '/static/img/ui_selection.png'),
(4, 7, 'Fotoğraf Gönderme', 'Ataş simgesine basarak galerinizden bir resim seçip paylaşın.', '/static/img/ui_selection.png'),
(4, 8, 'Görüntülü Arama', 'Sağ üstteki kamera simgesine basarak sevdiklerinizi canlı görün.', '/static/img/ui_app_open.png'),
(4, 9, 'Aramayı Sonlandırma', 'Görüşmeniz bittiğinde kırmızı telefon simgesiyle aramayı kapatın.', '/static/img/ui_success.png'),

-- e-Nabız (ID 5) - 8 Adım
(5, 1, 'Sisteme Bağlanın', 'e-Nabız uygulamasını açıp T.C. kimlik numaranızla giriş yapın.', '/static/img/ui_login.png'),
(5, 2, 'Ana Ekran Özeti', 'Karşınıza çıkan ekranda son ziyaret ettiğiniz hastaneleri görebilirsiniz.', '/static/img/ui_app_open.png'),
(5, 3, 'Tahlillerim Sekmesi', 'Menüden "Tahlillerim" kısmına girerek kan sonuçlarınızı listeleyin.', '/static/img/ui_selection.png'),
(5, 4, 'Sonuç Detayları', 'İlgili tahlilin üzerine basarak referans değerlerini inceleyin.', '/static/img/ui_selection.png'),
(5, 5, 'Reçetelerim', 'Doktorunuzun yazdığı ilaçları ve kullanım şekillerini buradan görün.', '/static/img/ui_selection.png'),
(5, 6, 'Görüntülerim', 'MR veya Röntgene ait raporları ve görüntüleri dijital olarak açın.', '/static/img/ui_selection.png'),
(5, 7, 'Aşı Takvimi', 'Geçmiş aşılarınızı ve sıradaki aşı randevularınızı takip edin.', '/static/img/ui_calendar.png'),
(5, 8, 'Bilgi Paylaşımı', 'Dilerseniz bu bilgileri doktorunuzla paylaşmak için izinleri yönetin.', '/static/img/ui_security.png'),

-- Yemek Siparişi (ID 6) - 9 Adım
(6, 1, 'Uygulamaya Giriş', 'Yemeksepeti veya benzeri bir yemek uygulamasını başlatın.', '/static/img/ui_app_open.png'),
(6, 2, 'Konum Bilgisi', 'GPS özelliğini açın veya mahalle/sokak bilgilerinizi elle girin.', '/static/img/ui_selection.png'),
(6, 3, 'Mutfak Türü Seçin', 'Kebap, Pizza, Ev Yemekleri gibi seçenekler arasından karar verin.', '/static/img/ui_selection.png'),
(6, 4, 'Restoran Puanları', 'Listelenen yerlerin yanındaki yıldız puanlarını ve yorumlarını inceleyin.', '/static/img/ui_selection.png'),
(6, 5, 'Menüden Seçim', 'Restoranın içine girip istediğiniz yemeğin yanındaki "Ekle"ye basın.', '/static/img/ui_selection.png'),
(6, 6, 'Sos ve Ekstra Seçimi', 'İçecek, tatlı veya yan ürün seçeneklerini sepetinize ekleyin.', '/static/img/ui_selection.png'),
(6, 7, 'Sepeti Onayla', 'Sağ alttaki sepet ikonuna basarak sipariş özetine gidin.', '/static/img/ui_success.png'),
(6, 8, 'Ödeme ve Notlar', 'Kapı zili çalmasın gibi notlarınızı ekleyin ve ödeme tipini seçin.', '/static/img/ui_security.png'),
(6, 9, 'Kurye Takibi', 'Siparişiniz onaylandığında kuryenin gelişini haritadan izleyin.', '/static/img/ui_calendar.png');

-- Reset sequences after seeding
SELECT setval('guides_id_seq', (SELECT MAX(id) FROM guides));
SELECT setval('guide_steps_id_seq', (SELECT MAX(id) FROM guide_steps));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Fraud Scenarios
CREATE TABLE IF NOT EXISTS fraud_scenarios (
    id SERIAL PRIMARY KEY,
    scenario TEXT NOT NULL,
    correct_action VARCHAR(50) NOT NULL,
    explanation TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Guide Progress
CREATE TABLE IF NOT EXISTS user_guide_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guide_id INTEGER REFERENCES guides(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 1,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, guide_id)
);

INSERT INTO fraud_scenarios (scenario, correct_action, explanation, difficulty) VALUES
('Telefonda kendini polis veya savcı olarak tanıtan biri aradı. ''Adınız bir terör örgütü soruşturmasına karıştı, bankadaki paranızı güvence altına almamız lazım, size vereceğimiz hesap numarasına paranızı gönderin'' diyor.', 'hangup', 'Devlet görevlileri (Polis, Savcı, Jandarma) asla vatandaştan para istemez veya hesap numarası vermez. Bu en yaygın dolandırıcılık yöntemidir. Telefonu hemen kapatın ve 155''i arayın.', 1),
('Bankadan aradığını söyleyen bir kişi, ''Hesabınızdan şüpheli bir işlem yapıldı, iptal etmek için telefonunuza gelen şifreyi bize söyleyin'' diyor.', 'hangup', 'Bankalar asla telefonda şifrenizi veya onay kodunuzu istemez. Bu şifreler sadece sizin kullanımınız içindir. Kimseyle paylaşmayın.', 1),
('Telefonunuza bir mesaj geldi: ''Tebrikler! Son model bir telefon kazandınız. Ödülünüzü almak için sadece kargo ücretini ödemeniz gerekiyor, şu linke tıklayın.''', 'hangup', 'Bedava peynir sadece fare kapanında olur. Tanımadığınız numaralardan gelen ödül mesajları ve linkler genellikle virüslüdür veya kredi kartı bilgilerinizi çalmak içindir.', 1),
('Telefonda ağlayan bir ses: ''Dede (veya Babaanne), ben torunun. Kaza yaptım, çok acil paraya ihtiyacım var ama ailem duymasın. Arkadaşımın hesabına para gönderir misin?''', 'hangup', 'Dolandırıcılar ağlama sesi taklidi yaparak veya gürültülü bir ortamdaymış gibi davranarak sizi paniğe sürükler. Önce torununuzu veya ailesini kendi bildiğiniz numaradan arayıp teyit edin.', 2),
('Bir avukatlık bürosundan aradıklarını söylüyorlar: ''Geçmişe dönük ödenmemiş sağlık sigortası borcunuz var. Bugün ödemezseniz haciz işlemi başlatılacak.''', 'hangup', 'Sizi korkutarak ve aceleye getirerek düşünmenizi engellemeye çalışıyorlar. Resmi borçlar e-Devlet üzerinden kontrol edilebilir. Telefonda ödeme yapmayın.', 2),
('Kullandığınız bankanın logosunu taşıyan bir e-posta geldi: ''Kredi kartı aidatlarınızı iade ediyoruz. İade için aşağıdaki butona tıklayıp kart bilgilerinizi girin.''', 'hangup', 'Bankalar aidat iadesi için kart bilgilerini istemezler. Gelen e-posta sahte bir siteye yönlendiriyor olabilir. Bankanızı arayarak teyit edin.', 2),
('Marketten çıktınız, yanınıza iyi giyimli biri geldi. ''Emekliler için hediye çeki dağıtıyoruz ama telefonunuzdan bir onay vermeniz gerekiyor'' diyerek telefonunuzu istiyor.', 'hangup', 'Tanımadığınız kişilere telefonunuzu vermeyin. Sizin adınıza kredi başvurusu yapabilir veya mobil ödeme işlemi gerçekleştirebilirler.', 1),
('Sosyal medyada ''Devletten 5000 TL yardım parası! Başvuru için tıklayın'' şeklinde bir ilan gördünüz. Linke tıkladığınızda TC kimlik ve banka bilgilerinizi istiyor.', 'hangup', 'Devlet yardımları sadece e-Devlet veya resmi kurumlar üzerinden yapılır. Sosyal medya reklamlarına itibar etmeyin.', 1),
('İnternet sağlayıcınızdan aradıklarını söylüyorlar: ''İnternet faturanızda hata olmuş, size 200 TL iade yapacağız. İşlem için kart numaranızı kodlayın.''', 'hangup', 'Kurumlar iade yapacaksa bunu faturadan düşerler veya IBAN isterler. Asla kart numarası ve şifre istemezler.', 2),
('Jandarmadan aradığını söyleyen biri, kimliğinizin bir kuyumcu soygununda bulunduğunu, parmak izi kontrolü için evdeki altınlarınızı bir poşete koyup kapıdaki görevliye vermeniz gerektiğini söylüyor.', 'hangup', 'Jandarma veya polis asla evinize gelip altın veya para istemez. Bu, suçluluk psikolojisi ve korku yaratarak yapılan bir dolandırıcılıktır.', 1);

