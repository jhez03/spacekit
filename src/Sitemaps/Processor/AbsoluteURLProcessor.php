<?php

namespace App\Sitemaps\Processor;

use Pimcore\Bundle\SeoBundle\Sitemap\Element\GeneratorContextInterface;
use Pimcore\Bundle\SeoBundle\Sitemap\Element\ProcessorInterface;
use Pimcore\Bundle\SeoBundle\Sitemap\UrlGeneratorInterface;
use Presta\SitemapBundle\Sitemap\Url\Url;
use Pimcore\Model\Element\ElementInterface;
use Presta\SitemapBundle\Sitemap\Url\UrlConcrete;

class AbsoluteURLProcessor implements ProcessorInterface
{
    public function __construct(private UrlGeneratorInterface $urlGenerator)
    {}
    public function process(Url $url, ElementInterface $element, GeneratorContextInterface $context): ?Url
    {
        $path = $this->urlGenerator->generateUrl($url->getLoc());

        return new UrlConcrete($path);
    }
}
