// This file helps load the Noto Sans Devanagari font for jsPDF
import { jsPDF } from 'jspdf';

// Base64 encoded Noto Sans Devanagari font
// You need to convert the TTF file to base64
// For now, let's use a CDN approach that works

export const registerDevanagariFont = async (doc: jsPDF) => {
  try {
    // Method 1: Try to load from CDN (most reliable)
    const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf';
    
    const response = await fetch(fontUrl);
    const fontArrayBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64Font = arrayBufferToBase64(fontArrayBuffer);
    
    // Add font to jsPDF
    doc.addFileToVFS('NotoSansDevanagari.ttf', base64Font);
    doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');
    
    console.log('✅ Devanagari font loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Font loading failed:', error);
    return false;
  }
};

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}