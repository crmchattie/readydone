import { DataStreamWriter } from 'ai';

export class MockDataStream implements DataStreamWriter {
  private data: any[] = [];

  writeData(data: any) {
    this.data.push(data);
  }

  writeMessageAnnotation(value: any) {
    this.data.push({ type: 'annotation', value });
  }

  writeSource(source: any) {
    this.data.push({ type: 'source', value: source });
  }

  write(data: string) {
    this.data.push({ type: 'text', value: data });
  }

  merge(stream: ReadableStream<any>) {
    // No-op for testing
  }

  onError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    this.data.push({ type: 'error', value: message });
    return message;
  }

  getData() {
    return this.data;
  }

  clear() {
    this.data = [];
  }
} 