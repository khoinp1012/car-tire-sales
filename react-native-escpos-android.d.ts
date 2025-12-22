declare module 'react-native-escpos-android' {
  const EscPos: {
    printQrCode: (data: string, options?: { align?: string; size?: number }) => Promise<void>;
    write: (options: { text?: string; raw?: number[]; cut?: boolean }) => Promise<void>;
    // Add other methods as needed
  };
  export default EscPos;
}
