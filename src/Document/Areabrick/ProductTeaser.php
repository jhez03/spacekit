<?php

namespace App\Document\Areabrick;

use Pimcore\Extension\Document\Areabrick\AbstractTemplateAreabrick;

class ProductTeaser extends AbstractTemplateAreabrick
{
    public function getName(): string
    {
        return 'Product Teaser';
    }
}

