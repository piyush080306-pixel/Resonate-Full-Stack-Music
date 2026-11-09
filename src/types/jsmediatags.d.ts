declare module 'jsmediatags/dist/jsmediatags.min.js' {
  const jsmediatags: {
    Reader: new (file: File | Buffer) => {
      setTagsToRead: (tags: string[]) => {
        read: (callbacks: {
          onSuccess: (result: { tags: Record<string, unknown> }) => void;
          onError: (error: { type?: string; info?: string }) => void;
        }) => void;
      };
    };
  };
  export default jsmediatags;
}
