<?php
// src/Twig/LinkGeneratorExtension.php

namespace App\Twig\Extension;

use App\Website\LinkGenerator\ProductLinkGenerator;
use Pimcore\Model\DataObject\Product;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

class LinkGeneratorExtension extends AbstractExtension
{
    public function __construct(private ProductLinkGenerator $productLinkGenerator)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('app_link', [$this, 'generateProductLink']),
        ];
    }

    public function generateProductLink(Product $product): string
    {
        return $this->productLinkGenerator->generate($product);
    }
}

