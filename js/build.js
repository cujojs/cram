// parameters: config and moduleInfo 
// Builder, Resolver, Loader, fetcher, writer are defined in the calling code
function build (config, moduleInfo) {

	var builder = new Builder();
	builder.resolver = new Resolver('', config);
	builder.loader = new Loader();
	builder.loader.resolver = builder.resolver;
	builder.fetcher = fetcher.fetch;
	builder.writer = writer.getWriter();
	builder.build(moduleInfo, config);
	print(writer.getOutput());

}
