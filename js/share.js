let shareDialogOpener = shareButton;
const closeQrDialog = () => {
    qrDialog.classList.remove('is-open');
    qrDialog.setAttribute('aria-hidden', 'true');
    shareDialogOpener?.focus();
};

const openShareDialog = async (opener) => {
    shareDialogOpener = opener;
    qrDialog.classList.add('is-open');
    qrDialog.setAttribute('aria-hidden', 'false');
    qrCode.replaceChildren();
    shareUrlLink.textContent = '共有リンクを作成しています…';
    shareUrlLink.removeAttribute('href');
    shareCopyButton.disabled = true;
    qrDownloadButton.disabled = true;
    qrMessage.classList.remove('qr-error');
    qrMessage.textContent = 'QRコードを作成しています…';
    try {
        if (typeof QRCode === 'undefined') throw new Error('QR library unavailable');
        const shareUrl = await createShareUrl();
        shareUrlLink.href = shareUrl;
        shareUrlLink.textContent = shareUrl;
        shareUrlLink.title = shareUrl;
        shareCopyButton.disabled = false;
        new QRCode(qrCode, {
            text: shareUrl,
            width: 260,
            height: 260,
            colorDark: '#111111',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });
        qrDownloadButton.disabled = false;
        qrMessage.textContent = 'URLをコピーするか，QRコードを読み取って共有できます。';
        qrClose.focus();
    } catch (error) {
        qrMessage.classList.add('qr-error');
        qrMessage.textContent = 'コードが長すぎるか，QRコード機能を読み込めませんでした。';
    }
};

shareButton.addEventListener('click', (event) => openShareDialog(event.currentTarget));
shareCopyButton.addEventListener('click', async () => {
    const shareUrl = shareUrlLink.getAttribute('href');
    if (!shareUrl) return;
    try {
        await copyText(shareUrl);
        showButtonSuccess(shareCopyButton, 'コピーしました');
    } catch (error) {
        window.prompt('このURLをコピーしてください', shareUrl);
    }
});
qrDownloadButton.addEventListener('click', () => {
    const canvas = qrCode.querySelector('canvas');
    const image = qrCode.querySelector('img');
    const imageUrl = canvas?.toDataURL('image/png') || image?.src;
    if (!imageUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = 'program-share-qr.png';
    downloadLink.click();
});
qrClose.addEventListener('click', closeQrDialog);
qrDialog.addEventListener('click', (event) => {
    if (event.target === qrDialog) closeQrDialog();
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && qrDialog.classList.contains('is-open')) closeQrDialog();
});

