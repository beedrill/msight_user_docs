# Generate Automatic Documentation
In the root of the project directory:
```bash
sphinx-apidoc -o apidoc/msight_edge_rst msight_edge
```

Now, in the apidoc directory, run:
```bash
make clean
make html
```
