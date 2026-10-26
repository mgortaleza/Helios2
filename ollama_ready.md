# Ollama Background Engine & Model Verification

- **Service Status:** Active & Running
- **Host Endpoint:** `http://127.0.0.1:11434`
- **Ollama Version:** `0.40.11`
- **Executable Path:** `C:\Users\mark.AD\AppData\Local\Programs\Ollama\ollama.exe`
- **Installed Model:** `qwen2.5-coder:14b` (ID: `9ec8897f747e`, Size: 9.0 GB, Quantization: `Q4_K_M`)
- **Inference Verification:** Successfully generated test completion from `qwen2.5-coder:14b`.

## Model Information
```json
{
  "name": "qwen2.5-coder:14b",
  "model": "qwen2.5-coder:14b",
  "size": 8988124298,
  "details": {
    "format": "gguf",
    "family": "qwen2",
    "parameter_size": "14.8B",
    "quantization_level": "Q4_K_M",
    "context_length": 32768
  }
}
```

## Quick Test Command
```bash
ollama run qwen2.5-coder:14b "Write a hello world program in Python"
```

