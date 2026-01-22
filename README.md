# MSight Documentation
## Pull the Docs Locally
To pull the documentation repository locally, run:
```bash
git clone https://github.com/michigan-traffic-lab/MSight_user_docs.git
git submodule update --init --recursive
```

## Run the Documentation Server
To run the documentation server:
```bash
pip install mkdocs
pip install mkdocs-material
```

Then to serve it:
```bash
mkdocs serve
```