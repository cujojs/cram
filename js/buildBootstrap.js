// config and moduleInfo are defined in the calling code
// as are Builder, Resolver, Loader, fetcher, writer
function bootstrap (config, moduleInfo) {

	var builder = new Builder();
	builder.resolver = new Resolver('', config);
	builder.loader = new Loader();
	builder.loader.resolver = builder.resolver;
	builder.fetcher = fetcher;
	builder.writer = writer.getWriter();
	builder.build(moduleInfo, config);
	print(writer.getOutput());

}
