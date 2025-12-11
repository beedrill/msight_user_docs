# Testing MSight Edge

This document provides comprehensive instructions for running tests in the MSight Edge project.

## Test Structure

The test suite is organized in the `tests/` directory with the following structure:

```
tests/
├── test_logger.py              # Logger utility tests
├── communication/              # Communication layer tests
│   ├── test_node_register.py   # Node registration tests
│   ├── test_redis_publish.py   # Redis publishing tests
│   ├── test_topic.py           # Topic management tests
│   └── sample_image.jpg        # Test image for communication tests
├── data/                       # Data handling tests
│   ├── test_image_data.py      # ImageData serialization/deserialization tests
│   └── sample_image.jpg        # Test image for data tests
└── sample_data/                # Sample test data
    └── image_data/             # Additional test images
```

## Prerequisites

### 1. Install Dependencies

Install the project in development mode with test dependencies:

```bash
# Install the project in development mode
pip install -e .

# Install pytest (if not already installed)
pip install pytest
```

### 2. Redis Server

Many tests require a Redis server to be running. You can start Redis using Docker:

```bash
# Start Redis server
docker run -d --name redis-test -p 6379:6379 redis:latest
```

Or install and run Redis locally:

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# On macOS with Homebrew
brew install redis
brew services start redis

# On Windows (using WSL or Docker is recommended)
```

Verify Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

## Running Tests

### Run All Tests

To run the entire test suite:

```bash
# From the project root directory
pytest tests/

# With verbose output
pytest tests/ -v

# With detailed output and print statements
pytest tests/ -v -s
```

### Run Specific Test Categories

#### Logger Tests
```bash
pytest tests/test_logger.py -v
```

#### Communication Tests
```bash
# All communication tests
pytest tests/communication/ -v

# Specific communication tests
pytest tests/communication/test_node_register.py -v
pytest tests/communication/test_redis_publish.py -v
pytest tests/communication/test_topic.py -v
```

#### Data Tests
```bash
# All data tests
pytest tests/data/ -v

# Specific data test
pytest tests/data/test_image_data.py -v
```

### Run Individual Test Functions

```bash
# Run a specific test function
pytest tests/test_logger.py::test_create_logger -v
pytest tests/communication/test_topic.py::test_topic_register -v
pytest tests/data/test_image_data.py::test_image_data -v
```

## Test Descriptions

### Logger Tests (`test_logger.py`)
- **`test_create_logger`**: Tests the logger creation utility, verifying proper log level handling and message output.

### Communication Tests

#### Node Registration Tests (`test_node_register.py`)
- **`test_local_image_source_node`**: Tests node registration and unregistration functionality with Redis.

#### Redis Publishing Tests (`test_redis_publish.py`)
- **`test_image_publish`**: Tests image publishing through Redis using LocalImageSourceNode with a sample image.

#### Topic Tests (`test_topic.py`)
- **`test_topic_register`**: Tests topic registration and retrieval from Redis, ensuring proper serialization of topic metadata.

### Data Tests

#### Image Data Tests (`test_image_data.py`)
- **`test_image_data`**: Tests ImageData serialization and deserialization, including:
  - Image encoding/decoding with OpenCV
  - Metadata preservation (sensor name, timestamps)
  - Binary serialization/deserialization
  - Image integrity after round-trip conversion

## Troubleshooting

### Common Issues

#### Redis Connection Errors
```
redis.exceptions.ConnectionError: Error 10061 connecting to localhost:6379
```
**Solution**: Ensure Redis server is running (see Prerequisites section).
## Adding New Tests

When adding new tests:

1. Follow the naming convention: `test_*.py` for test files and `test_*` for test functions
2. Place tests in the appropriate subdirectory based on functionality
3. Include necessary sample data in the same directory or `sample_data/`
4. Ensure tests are independent and can run in any order
5. Mock external dependencies when possible
6. Update this documentation with new test descriptions

## Performance Testing

For performance and load testing:

```bash
# Install performance testing tools
pip install pytest-benchmark

# Run with benchmarking
pytest tests/ --benchmark-only

# Run specific performance tests (if any)
pytest tests/performance/ -v
```
