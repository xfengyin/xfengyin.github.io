# frozen_string_literal: true

source "https://rubygems.org"

gem "jekyll-theme-chirpy", "~> 6.5", ">= 6.5.5"

group :jekyll_plugins do
  gem "jekyll-archives"
  gem "jekyll-paginate"
  gem "jekyll-sitemap"
  gem "jekyll-seo-tag"
end

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

group :test do
  gem "htmlproofer", "~> 5.0"
  gem "bundler-audit", "~> 0.9"
end

# Lock jekyll version to avoid breaking changes
# gem "jekyll", "~> 4.3"
